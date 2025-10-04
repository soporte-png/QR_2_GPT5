const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const { db, initializeDatabase } = require('./database');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-token';

initializeDatabase();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const dbRun = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function runCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });

const dbGet = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const dbAll = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token requerido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado.' });
    }

    req.user = payload;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción.' });
    }

    next();
  };
}

async function getConfigEntries() {
  const rows = await dbAll('SELECT key, value FROM config');
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
}

async function upsertConfigValue(key, value) {
  await dbRun(
    'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, String(value ?? '')]
  );
}

async function getNextSequenceValue(key, fallback) {
  const row = await dbGet('SELECT value FROM config WHERE key = ?', [key]);
  let currentValue = row && row.value !== undefined ? row.value : undefined;

  if (currentValue === undefined || currentValue === null || currentValue === '') {
    currentValue = fallback;
  }

  let current;
  let next;

  try {
    const currentBig = BigInt(currentValue);
    current = currentBig;
    next = currentBig + 1n;
  } catch (error) {
    const numeric = Number(currentValue);
    if (Number.isNaN(numeric)) {
      current = 0;
      next = 1;
    } else {
      current = numeric;
      next = numeric + 1;
    }
  }

  await upsertConfigValue(key, next.toString());

  return current.toString();
}

function buildBarcodePayload({ glnBase, debtorId, value, dueDate }) {
  const gs = String.fromCharCode(29);
  const debtorIdFormatted = debtorId.toString().padStart(10, '0');
  const valueFormatted = Math.round(Number(value)).toString().padStart(8, '0');
  const dueDateFormatted = dueDate.replace(/-/g, '');

  const payload = `415${glnBase}${debtorIdFormatted}${gs}3900${valueFormatted}${gs}96${dueDateFormatted}`;
  const humanReadable = `(415)${glnBase}${debtorIdFormatted} (3900)${valueFormatted} (96)${dueDateFormatted}`;

  return {
    payload,
    humanReadable,
    debtorIdFormatted,
    valueFormatted,
    dueDateFormatted,
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/config/public', async (req, res) => {
  try {
    const config = await getConfigEntries();
    res.json({
      company_name: config.company_name || '',
      app_logo: config.app_logo || '',
      login_logo: config.login_logo || '',
    });
  } catch (error) {
    console.error('Error en /api/config/public:', error);
    res.status(500).json({ message: 'No fue posible obtener la configuración pública.' });
  }
});

app.get('/api/config/runtime', authenticateToken, async (req, res) => {
  try {
    const config = await getConfigEntries();
    res.json({
      gln_base: config.gln_base || '0000000024602',
      company_name: config.company_name || 'NARANJO AZCARATE Y ASOCIADOS SAS',
      base_document: config.base_document || '0000000000',
      collection_account: config.collection_account || '256940842',
      pdf_logo: config.pdf_logo || '',
      app_logo: config.app_logo || '',
      login_logo: config.login_logo || '',
    });
  } catch (error) {
    console.error('Error en /api/config/runtime:', error);
    res.status(500).json({ message: 'No fue posible obtener la configuración del sistema.' });
  }
});

app.get('/api/config', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const config = await getConfigEntries();
    res.json(config);
  } catch (error) {
    console.error('Error en /api/config [GET]:', error);
    res.status(500).json({ message: 'No fue posible obtener la configuración.' });
  }
});

app.post('/api/config', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const allowedKeys = new Set([
    'gln_base',
    'company_name',
    'base_document',
    'collection_account',
    'agreement_sequence',
    'obligation_sequence',
    'pdf_logo',
    'app_logo',
    'login_logo',
  ]);

  try {
    const updates = Object.entries(req.body || {}).filter(([key]) => allowedKeys.has(key));

    if (!updates.length) {
      return res.status(400).json({ message: 'No se recibieron parámetros válidos para actualizar.' });
    }

    // Validaciones básicas
    const validationErrors = [];
    updates.forEach(([key, value]) => {
      if (key === 'gln_base' && (!value || value.length !== 13)) {
        validationErrors.push('El GLN debe tener 13 dígitos.');
      }

      if (key === 'base_document' && (!value || value.length !== 10)) {
        validationErrors.push('El documento base debe tener 10 dígitos.');
      }

      if (key === 'collection_account' && (!value || typeof value !== 'string')) {
        validationErrors.push('La cuenta de recaudo es obligatoria.');
      }
    });

    if (validationErrors.length) {
      return res.status(400).json({ message: validationErrors.join(' ') });
    }

    for (const [key, value] of updates) {
      await upsertConfigValue(key, value);
    }

    const config = await getConfigEntries();

    res.json({ message: 'Configuración actualizada correctamente.', config });
  } catch (error) {
    console.error('Error en /api/config [POST]:', error);
    res.status(500).json({ message: 'No fue posible actualizar la configuración.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
  }

  try {
    const user = await dbGet(
      'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en /api/login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

app.post('/api/coupons', authenticateToken, async (req, res) => {
  const { debtor_name, debtor_id, value, due_date } = req.body;

  if (!debtor_name || !debtor_id || value === undefined || !due_date) {
    return res.status(400).json({
      message: 'Los campos nombre del deudor, cédula, valor y fecha de vencimiento son obligatorios.',
    });
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return res.status(400).json({ message: 'El valor del cupón debe ser numérico.' });
  }

  try {
    const createdAt = new Date().toISOString();
    const config = await getConfigEntries();

    const glnBase = config.gln_base || '0000000024602';
    const companyName = config.company_name || 'NARANJO AZCARATE Y ASOCIADOS SAS';
    const collectionAccount = config.collection_account || '256940842';
    const pdfLogo = config.pdf_logo || '';

    const generatedAgreementNumber = await getNextSequenceValue(
      'agreement_sequence',
      '1'
    );
    const generatedObligationNumber = await getNextSequenceValue(
      'obligation_sequence',
      '1'
    );

    const {
      payload,
      humanReadable,
      debtorIdFormatted,
      valueFormatted,
      dueDateFormatted,
    } = buildBarcodePayload({
      glnBase,
      debtorId: debtor_id,
      value: numericValue,
      dueDate,
    });

    const { lastID } = await dbRun(
      `INSERT INTO coupons (
        debtor_name,
        debtor_id,
        value,
        due_date,
        created_at,
        created_by_user_id,
        agreement_number,
        obligation_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        debtor_name,
        debtorIdFormatted,
        numericValue,
        due_date,
        createdAt,
        req.user.id,
        generatedAgreementNumber,
        generatedObligationNumber,
      ]
    );

    const newCoupon = await dbGet(
      `SELECT c.*, u.username AS created_by_username
       FROM coupons c
       LEFT JOIN users u ON c.created_by_user_id = u.id
       WHERE c.id = ?`,
      [lastID]
    );

    res.status(201).json({
      coupon: newCoupon,
      barcode: {
        payload,
        human_readable: humanReadable,
        debtor_id: debtorIdFormatted,
        value: valueFormatted,
        due_date: dueDateFormatted,
      },
      config: {
        company_name: companyName,
        collection_account: collectionAccount,
        pdf_logo: pdfLogo,
        gln_base: glnBase,
      },
    });
  } catch (error) {
    console.error('Error en /api/coupons [POST]:', error);
    res.status(500).json({ message: 'Error al crear el cupón.' });
  }
});

app.get('/api/coupons', authenticateToken, async (req, res) => {
  const {
    debtor_name,
    debtor_id,
    created_by_user_id,
    created_by_username,
    due_date,
    due_date_from,
    due_date_to,
    created_from,
    created_to,
    value_min,
    value_max,
  } = req.query;

  const filters = [];
  const params = [];

  if (debtor_name) {
    filters.push('LOWER(c.debtor_name) LIKE ?');
    params.push(`%${debtor_name.toLowerCase()}%`);
  }

  if (debtor_id) {
    filters.push('c.debtor_id = ?');
    params.push(debtor_id);
  }

  if (created_by_user_id) {
    filters.push('c.created_by_user_id = ?');
    params.push(created_by_user_id);
  }

  if (created_by_username) {
    filters.push('LOWER(u.username) = ?');
    params.push(created_by_username.toLowerCase());
  }

  if (due_date) {
    filters.push('DATE(c.due_date) = DATE(?)');
    params.push(due_date);
  }

  if (due_date_from) {
    filters.push('DATE(c.due_date) >= DATE(?)');
    params.push(due_date_from);
  }

  if (due_date_to) {
    filters.push('DATE(c.due_date) <= DATE(?)');
    params.push(due_date_to);
  }

  if (created_from) {
    filters.push('datetime(c.created_at) >= datetime(?)');
    params.push(created_from);
  }

  if (created_to) {
    filters.push('datetime(c.created_at) <= datetime(?)');
    params.push(created_to);
  }

  if (value_min !== undefined) {
    const minNumber = Number(value_min);
    if (!Number.isNaN(minNumber)) {
      filters.push('c.value >= ?');
      params.push(minNumber);
    }
  }

  if (value_max !== undefined) {
    const maxNumber = Number(value_max);
    if (!Number.isNaN(maxNumber)) {
      filters.push('c.value <= ?');
      params.push(maxNumber);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const coupons = await dbAll(
      `SELECT c.*, u.username AS created_by_username
       FROM coupons c
       LEFT JOIN users u ON c.created_by_user_id = u.id
       ${whereClause}
       ORDER BY datetime(c.created_at) DESC`,
      params
    );

    res.json({ coupons });
  } catch (error) {
    console.error('Error en /api/coupons [GET]:', error);
    res.status(500).json({ message: 'Error al obtener los cupones.' });
  }
});

app.post('/api/users/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: 'La contraseña actual y la nueva contraseña son obligatorias.' });
  }

  try {
    const user = await dbGet('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error en /api/users/change-password:', error);
    res.status(500).json({ message: 'No fue posible actualizar la contraseña.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
  });
}

module.exports = {
  app,
  authenticateToken,
  authorizeRoles,
};
