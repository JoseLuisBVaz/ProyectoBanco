// ==================== TEST DE DEPÓSITO ====================
// Este script prueba la funcionalidad de depósitos

const emailService = require('./services/emailService');

async function testDeposit() {
  console.log('🧪 ========== TEST DE DEPÓSITO ==========\n');
  
  try {
    // 1️⃣ Verificar conexión
    console.log('1️⃣ Verificando conexión con servidor de correo...');
    const connectionResult = await emailService.verifyConnection();
    
    if (!connectionResult.success) {
      console.error('❌ Error de conexión:', connectionResult.error);
      process.exit(1);
    }
    
    console.log('✅ Conexión exitosa\n');
    
    // 2️⃣ Enviar correo de prueba de depósito
    console.log('2️⃣ Enviando correo de prueba de depósito...');
    
    const testData = {
      customerName: 'Juan Pérez García',
      amount: 1500.00,
      accountNumber: '1234567890',
      description: 'Depósito en efectivo - Sucursal Centro',
      tranId: '12345',
      date: new Date().toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      newBalance: 5500.00
    };
    
    const result = await emailService.sendDepositReceivedEmail('punguis222@gmail.com', testData);
    
    if (result.success) {
      console.log('✅ Correo enviado exitosamente!');
      console.log('   ID del mensaje:', result.messageId);
      console.log('\n📧 Revisa tu bandeja de entrada en: punguis222@gmail.com');
    } else {
      console.error('❌ Error al enviar correo:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error durante el test:', error);
  }
}

// Ejecutar test
testDeposit();
