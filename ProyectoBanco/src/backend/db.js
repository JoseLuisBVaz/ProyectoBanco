const mysql = require('mysql2');

// Configuración de conexión a MySQL
const db = mysql.createConnection({
  host: 'database-1.c5emsau6exwb.us-east-2.rds.amazonaws.com',
  user: 'admin',
  password: 'root1234',
  database: 'banco_jety',
});

db.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL - Base de datos: Banco_Jety');
});

module.exports = db;
