// Verificar si el stored procedure existe
const db = require('./db');

console.log('🔍 Verificando stored procedure sp_deposit_funds...\n');

db.query('SHOW PROCEDURE STATUS WHERE Name = "sp_deposit_funds"', (err, results) => {
  if (err) {
    console.error('❌ Error al consultar:', err.message);
    process.exit(1);
  }
  
  if (results.length === 0) {
    console.error('❌ El stored procedure sp_deposit_funds NO EXISTE en la base de datos');
    console.log('\n📋 Necesitas ejecutar el archivo: ProyectoBanco/src/backend/sql/sp_deposit_funds.sql');
    console.log('\n💡 Opciones para ejecutarlo:');
    console.log('   1. Abre MySQL Workbench');
    console.log('   2. Conecta a la base de datos Banco_Jety');
    console.log('   3. Abre el archivo sp_deposit_funds.sql');
    console.log('   4. Ejecuta todo el script (Ctrl+Shift+Enter)');
  } else {
    console.log('✅ El stored procedure sp_deposit_funds EXISTE');
    console.log('\nDetalles:');
    console.log(results[0]);
  }
  
  process.exit(0);
});
