// Script para crear el stored procedure automáticamente
const db = require('./db');
const fs = require('fs');
const path = require('path');

console.log('🔧 Instalando stored procedure sp_deposit_funds...\n');

// Leer el archivo SQL
const sqlFilePath = path.join(__dirname, 'sql', 'sp_deposit_funds.sql');
let sql = fs.readFileSync(sqlFilePath, 'utf8');

// Remover DELIMITER statements (no son necesarios en Node.js)
sql = sql.replace(/DELIMITER \$\$/g, '');
sql = sql.replace(/DELIMITER ;/g, '');
sql = sql.replace(/\$\$/g, '');

console.log('📄 SQL leído del archivo');

// Ejecutar el SQL
db.query(sql, (err, results) => {
  if (err) {
    console.error('❌ Error al crear el stored procedure:', err.message);
    console.error('\n💡 Intenta ejecutarlo manualmente desde MySQL Workbench');
    process.exit(1);
  }
  
  console.log('✅ Stored procedure sp_deposit_funds creado exitosamente!');
  
  // Verificar que se creó
  db.query('SHOW PROCEDURE STATUS WHERE Name = "sp_deposit_funds"', (err, results) => {
    if (err) {
      console.error('Error al verificar:', err.message);
      process.exit(1);
    }
    
    if (results.length > 0) {
      console.log('✅ Verificado: El stored procedure existe');
      console.log('\n🎉 ¡Ya puedes usar la funcionalidad de depósitos!');
    } else {
      console.log('⚠️  No se pudo verificar la creación');
    }
    
    process.exit(0);
  });
});
