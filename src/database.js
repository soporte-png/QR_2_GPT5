const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbDirectory = path.join(__dirname, '..', 'db');
const dbFile = path.join(dbDirectory, 'cuponera.db');

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log(`Base de datos conectada en ${dbFile}`);
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'operador'))
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debtor_name TEXT NOT NULL,
        debtor_id TEXT NOT NULL,
        value REAL NOT NULL,
        due_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by_user_id INTEGER NOT NULL,
        agreement_number TEXT,
        obligation_number TEXT,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    );

    const defaultUsers = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'operador', password: 'operador123', role: 'operador' },
    ];

    defaultUsers.forEach((user) => {
      db.get('SELECT id FROM users WHERE username = ?', [user.username], (err, row) => {
        if (err) {
          console.error('Error comprobando usuario por defecto:', err);
          return;
        }

        if (!row) {
          const passwordHash = bcrypt.hashSync(user.password, 10);
          db.run(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [user.username, passwordHash, user.role],
            (insertErr) => {
              if (insertErr) {
                console.error('Error insertando usuario por defecto:', insertErr);
              }
            }
          );
        }
      });
    });

    const defaultConfig = {
      gln_base: '0000000024602',
      company_name: 'NARANJO AZCARATE Y ASOCIADOS SAS',
      base_document: '0000000000',
      collection_account: '256940842',
      agreement_sequence: '56',
      obligation_sequence: '29039000003930057744',
      pdf_logo: '',
      app_logo: '',
      login_logo: '',
    };

    Object.entries(defaultConfig).forEach(([key, value]) => {
      db.run(
        'INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)',
        [key, value],
        (err) => {
          if (err) {
            console.error('Error insertando configuración por defecto:', err);
          }
        }
      );
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
};
