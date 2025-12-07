const mysql = require('mysql2');

// Configuración de conexión a MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'database-1.c5emsau6exwb.us-east-2.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_NAME || 'banco_jety',
});

db.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL - Base de datos: banco_jety');
});

module.exports = db;
