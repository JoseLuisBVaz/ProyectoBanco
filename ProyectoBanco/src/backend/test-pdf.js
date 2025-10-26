// Script de prueba para generar PDF de transferencia
const pdfService = require('./services/pdfService');
const fs = require('fs');

const testData = {
  tranId: 123,
  date: '25/10/2025 10:30:00',
  amount: 1500.00,
  fee: 10.00,
  originAccount: '0000127417',
  destinationAccount: '0000056573',
  description: 'Pago de prueba',
  senderName: 'José Luis Vázquez',
  senderEmail: 'punguis0@hotmail.com',
  recipientName: 'María González',
  recipientEmail: 'maria@test.com'
};

console.log('🧪 Iniciando prueba de generación de PDF...');

pdfService.generateTransferPDF(testData)
  .then((pdfBuffer) => {
    console.log('✅ PDF generado exitosamente');
    console.log(`📊 Tamaño del buffer: ${pdfBuffer.length} bytes`);
    
    // Guardar el PDF para verificación
    const filename = 'test_comprobante.pdf';
    fs.writeFileSync(filename, pdfBuffer);
    console.log(`💾 PDF guardado como: ${filename}`);
    console.log('🎉 Prueba completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error al generar PDF:', error);
    process.exit(1);
  });
