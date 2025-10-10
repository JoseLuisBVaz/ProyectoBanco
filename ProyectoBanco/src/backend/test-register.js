const axios = require('axios');

// Datos de prueba para registro
const testData = {
  mail: "test@example.com",
  pass: "123456",
  rol: "c",
  firstName: "Juan",
  lastNameP: "Perez",
  lastNameM: "Garcia",
  phoneNumber: "1234567890",
  birthday: "1990-01-01",
  address: "Calle Falsa 123",
  curp: "ABCD123456HDFABC01",
  rfc: "ABCD123456ABC",
  balance: 0
};

console.log('Probando registro con datos:', testData);

axios.post('http://localhost:3000/api/register', testData)
  .then(response => {
    console.log('✅ Registro exitoso:', response.data);
  })
  .catch(error => {
    console.error('❌ Error en registro:', error.response?.data || error.message);
  });