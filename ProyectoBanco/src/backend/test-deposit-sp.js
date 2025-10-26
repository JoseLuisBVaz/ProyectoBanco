// Test del endpoint de depósito con una cuenta real
const db = require('./db');

console.log('🧪 Probando depósito en base de datos...\n');

// Primero obtener una cuenta válida
db.query('SELECT accNum, clabe, balance FROM cAccount WHERE status = "active" LIMIT 1', (err, accounts) => {
  if (err) {
    console.error('❌ Error al obtener cuentas:', err.message);
    process.exit(1);
  }
  
  if (accounts.length === 0) {
    console.error('❌ No hay cuentas activas en la base de datos');
    process.exit(1);
  }
  
  const account = accounts[0];
  console.log('📋 Cuenta encontrada:');
  console.log('   Número:', account.accNum);
  console.log('   CLABE:', account.clabe);
  console.log('   Balance actual:', account.balance);
  console.log('');
  
  // Probar el stored procedure directamente
  const destination = account.accNum;
  const amount = 100;
  const description = 'Depósito de prueba';
  
  console.log('💰 Ejecutando depósito de $100...\n');
  
  const sql = 'CALL sp_deposit_funds(?, ?, ?)';
  db.query(sql, [destination, amount, description], (err, results) => {
    if (err) {
      console.error('❌ Error en el stored procedure:');
      console.error('   SQL State:', err.sqlState);
      console.error('   Mensaje:', err.sqlMessage || err.message);
      console.error('   Código:', err.code);
      process.exit(1);
    }
    
    console.log('✅ Depósito exitoso!');
    console.log('\n📊 Resultado:');
    const result = results[0][0];
    console.log('   ID Transacción:', result.tranId);
    console.log('   Comisión:', result.fee);
    console.log('   Nuevo Balance:', result.newBalance);
    console.log('   Mensaje:', result.message);
    
    process.exit(0);
  });
});
