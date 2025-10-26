// Test rápido del endpoint de depósito
const axios = require('axios');

async function testDeposit() {
  try {
    console.log('🧪 Probando endpoint de depósito...\n');
    
    // Usar una cuenta real de tu base de datos
    const response = await axios.post('http://localhost:3000/api/deposit', {
      destination: '0001234567',  // Cambia esto por un número de cuenta real
      amount: 100,
      description: 'Depósito de prueba'
    });
    
    console.log('✅ Respuesta exitosa:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error en la petición:');
    console.error('Status:', error.response?.status);
    console.error('Mensaje:', error.response?.data?.msg || error.message);
    console.error('Detalles:', JSON.stringify(error.response?.data, null, 2));
  }
}

testDeposit();
