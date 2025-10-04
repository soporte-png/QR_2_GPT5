const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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
  });
}

module.exports = {
  db,
  initializeDatabase,
};
