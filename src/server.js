const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { db, initializeDatabase } = require('./database');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-token';

initializeDatabase();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
  const {
    debtor_name,
    debtor_id,
    value,
    due_date,
    agreement_number = null,
    obligation_number = null,
  } = req.body;

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
        debtor_id,
        numericValue,
        due_date,
        createdAt,
        req.user.id,
        agreement_number,
        obligation_number,
      ]
    );

    const newCoupon = await dbGet(
      `SELECT c.*, u.username AS created_by_username
       FROM coupons c
       LEFT JOIN users u ON c.created_by_user_id = u.id
       WHERE c.id = ?`,
      [lastID]
    );

    res.status(201).json({ coupon: newCoupon });
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
