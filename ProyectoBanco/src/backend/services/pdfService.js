// ==================== SERVICIO DE GENERACIÓN DE PDFs ====================
// Genera comprobantes en PDF para transferencias y depósitos

const PDFDocument = require('pdfkit');

/**
 * Genera un PDF de comprobante de transferencia
 * @param {Object} data - Datos de la transferencia
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
const generateTransferPDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      // Capturar el PDF en memoria
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ==================== ENCABEZADO ====================
      doc
        .fontSize(24)
        .fillColor('#1a237e')
        .text('BANCO JETY', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(18)
        .fillColor('#333333')
        .text('Comprobante de Transferencia', { align: 'center' })
        .moveDown(1);

      // Línea divisoria
      doc
        .strokeColor('#1a237e')
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(1);

      // ==================== INFORMACIÓN DE LA TRANSACCIÓN ====================
      const startY = doc.y;

      // Folio
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Folio de Operación:', 50, startY);
      doc
        .fontSize(14)
        .fillColor('#333333')
        .text(`#${String(data.tranId).padStart(10, '0')}`, 50, startY + 15)
        .moveDown(1.5);

      // Fecha
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Fecha y Hora:', 50, doc.y);
      doc
        .fontSize(12)
        .fillColor('#333333')
        .text(data.date, 50, doc.y + 15)
        .moveDown(2);

      // ==================== MONTO ====================
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Monto Transferido:', { align: 'center' });
      
      doc
        .fontSize(32)
        .fillColor('#d32f2f')
        .text(`$${Number(data.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: 'center' })
        .moveDown(2);

      // ==================== DETALLES ====================
      doc
        .fontSize(14)
        .fillColor('#1a237e')
        .text('Detalles de la Operación', 50, doc.y)
        .moveDown(0.5);

      const detailsY = doc.y;
      
      // Línea divisoria
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, detailsY)
        .lineTo(550, detailsY)
        .stroke()
        .moveDown(1);

      // Función auxiliar para agregar detalles
      const addDetail = (label, value) => {
        const currentY = doc.y;
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(label, 70, currentY);
        
        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(value, 250, currentY, { width: 300, align: 'right' });
        
        doc.moveDown(0.8);
      };

      // Origen
      addDetail('Cuenta Origen:', data.originAccount || 'N/A');
      
      // Destino
      addDetail('Cuenta Destino:', data.destinationAccount || 'N/A');
      
      // Comisión
      addDetail('Comisión:', `$${Number(data.fee || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      
      // Concepto
      if (data.description) {
        const currentY = doc.y;
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text('Concepto:', 70, currentY);
        
        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(data.description, 70, currentY + 15, { width: 480, align: 'left' });
        
        doc.moveDown(2);
      }

      // ==================== INFORMACIÓN DEL REMITENTE ====================
      if (data.senderName) {
        doc.moveDown(1);
        doc
          .fontSize(14)
          .fillColor('#1a237e')
          .text('Remitente', 50, doc.y)
          .moveDown(0.5);

        const senderY = doc.y;
        doc
          .strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(50, senderY)
          .lineTo(550, senderY)
          .stroke()
          .moveDown(1);

        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(data.senderName, 70, doc.y);
        
        if (data.senderEmail) {
          doc.moveDown(0.5);
          doc
            .fontSize(10)
            .fillColor('#666666')
            .text(data.senderEmail, 70, doc.y);
        }
      }

      // ==================== INFORMACIÓN DEL BENEFICIARIO ====================
      if (data.recipientName) {
        doc.moveDown(2);
        doc
          .fontSize(14)
          .fillColor('#1a237e')
          .text('Beneficiario', 50, doc.y)
          .moveDown(0.5);

        const recipientY = doc.y;
        doc
          .strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(50, recipientY)
          .lineTo(550, recipientY)
          .stroke()
          .moveDown(1);

        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(data.recipientName, 70, doc.y);
        
        if (data.recipientEmail) {
          doc.moveDown(0.5);
          doc
            .fontSize(10)
            .fillColor('#666666')
            .text(data.recipientEmail, 70, doc.y);
        }
      }

      // ==================== PIE DE PÁGINA ====================
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 100;

      doc
        .fontSize(8)
        .fillColor('#999999')
        .text('Este comprobante es válido sin firma autógrafa.', 50, footerY, { align: 'center', width: 500 })
        .moveDown(0.5);

      doc
        .fontSize(8)
        .text('Banco JETY - Institución Bancaria', { align: 'center', width: 500 })
        .moveDown(0.3);

      doc
        .fontSize(8)
        .fillColor('#1a237e')
        .text('www.bancojety.com | soporte@bancojety.com', { align: 'center', width: 500 });

      // Finalizar el documento
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Genera un PDF de comprobante de depósito
 * @param {Object} data - Datos del depósito
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
const generateDepositPDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      // Capturar el PDF en memoria
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ==================== ENCABEZADO ====================
      doc
        .fontSize(24)
        .fillColor('#1a237e')
        .text('BANCO JETY', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(18)
        .fillColor('#333333')
        .text('Comprobante de Depósito', { align: 'center' })
        .moveDown(1);

      // Línea divisoria
      doc
        .strokeColor('#1a237e')
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(1);

      // ==================== INFORMACIÓN DEL DEPÓSITO ====================
      const startY = doc.y;

      // Folio
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Folio de Operación:', 50, startY);
      doc
        .fontSize(14)
        .fillColor('#333333')
        .text(`#${String(data.depId).padStart(10, '0')}`, 50, startY + 15)
        .moveDown(1.5);

      // Fecha
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Fecha y Hora:', 50, doc.y);
      doc
        .fontSize(12)
        .fillColor('#333333')
        .text(data.date, 50, doc.y + 15)
        .moveDown(2);

      // ==================== MONTO ====================
      doc
        .fontSize(10)
        .fillColor('#999999')
        .text('Monto Depositado:', { align: 'center' });
      
      doc
        .fontSize(32)
        .fillColor('#28a745')
        .text(`$${Number(data.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: 'center' })
        .moveDown(2);

      // ==================== DETALLES ====================
      doc
        .fontSize(14)
        .fillColor('#1a237e')
        .text('Detalles de la Operación', 50, doc.y)
        .moveDown(0.5);

      const detailsY = doc.y;
      
      // Línea divisoria
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, detailsY)
        .lineTo(550, detailsY)
        .stroke()
        .moveDown(1);

      // Función auxiliar para agregar detalles
      const addDetail = (label, value) => {
        const currentY = doc.y;
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(label, 70, currentY);
        
        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(value, 250, currentY, { width: 300, align: 'right' });
        
        doc.moveDown(0.8);
      };

      // Cuenta Destino
      addDetail('Cuenta Destino:', data.accountNumber || 'N/A');
      
      // Nuevo Saldo
      addDetail('Nuevo Saldo:', `$${Number(data.newBalance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      
      // Concepto
      if (data.description) {
        const currentY = doc.y;
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text('Concepto:', 70, currentY);
        
        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(data.description, 70, currentY + 15, { width: 480, align: 'left' });
        
        doc.moveDown(2);
      }

      // ==================== INFORMACIÓN DEL TITULAR ====================
      if (data.customerName) {
        doc.moveDown(1);
        doc
          .fontSize(14)
          .fillColor('#1a237e')
          .text('Titular de la Cuenta', 50, doc.y)
          .moveDown(0.5);

        const customerY = doc.y;
        doc
          .strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(50, customerY)
          .lineTo(550, customerY)
          .stroke()
          .moveDown(1);

        doc
          .fontSize(11)
          .fillColor('#333333')
          .text(data.customerName, 70, doc.y);
      }

      // ==================== PIE DE PÁGINA ====================
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 100;

      doc
        .fontSize(8)
        .fillColor('#999999')
        .text('Este comprobante es válido sin firma autógrafa.', 50, footerY, { align: 'center', width: 500 })
        .moveDown(0.5);

      doc
        .fontSize(8)
        .text('Banco JETY - Institución Bancaria', { align: 'center', width: 500 })
        .moveDown(0.3);

      doc
        .fontSize(8)
        .fillColor('#1a237e')
        .text('www.bancojety.com | soporte@bancojety.com', { align: 'center', width: 500 });

      // Finalizar el documento
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Genera un PDF del estado de cuenta
 * @param {Object} data - Datos del estado de cuenta (accountInfo, movements)
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
const generateAccountStatementPDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ==================== ENCABEZADO ====================
      doc
        .fontSize(24)
        .fillColor('#1a237e')
        .text('BANCO JETY', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(18)
        .fillColor('#333333')
        .text('Estado de Cuenta', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#666666')
        .text(`Generado el: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
        .moveDown(1);

      // Línea divisoria
      doc
        .strokeColor('#1a237e')
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(1);

      // ==================== INFORMACIÓN DE LA CUENTA ====================
      doc
        .fontSize(12)
        .fillColor('#1a237e')
        .text('Información de la Cuenta', 50, doc.y)
        .moveDown(0.5);

      const addField = (label, value) => {
        doc
          .fontSize(9)
          .fillColor('#666666')
          .text(label + ':', 50, doc.y);
        doc
          .fontSize(10)
          .fillColor('#333333')
          .text(value, 200, doc.y - 12);
        doc.moveDown(0.8);
      };

      addField('Titular', data.accountInfo.accountHolder);
      addField('Número de Cuenta', data.accountInfo.accNum);
      addField('CLABE', data.accountInfo.clabe);
      addField('Tipo de Cuenta', data.accountInfo.accType);
      addField('Saldo Actual', `$${Number(data.accountInfo.balance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

      doc.moveDown(1);

      // ==================== MOVIMIENTOS ====================
      doc
        .fontSize(12)
        .fillColor('#1a237e')
        .text(`Movimientos (${data.movements.length})`, 50, doc.y)
        .moveDown(0.5);

      // Encabezados de tabla
      const tableTop = doc.y;
      doc
        .fontSize(8)
        .fillColor('#1a237e')
        .font('Helvetica-Bold');

      doc.text('Fecha', 50, tableTop, { width: 70 });
      doc.text('Tipo', 125, tableTop, { width: 60 });
      doc.text('Descripción', 190, tableTop, { width: 150 });
      doc.text('Monto', 345, tableTop, { width: 70, align: 'right' });
      doc.text('Saldo', 425, tableTop, { width: 80, align: 'right' });

      // Línea debajo de encabezados
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(50, tableTop + 12)
        .lineTo(550, tableTop + 12)
        .stroke();

      doc.font('Helvetica');
      let currentY = tableTop + 20;

      // Limitar a los primeros 30 movimientos para evitar problemas de espacio
      const movementsToShow = data.movements.slice(0, 30);

      movementsToShow.forEach((mov, index) => {
        // Verificar si necesitamos nueva página
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        const date = new Date(mov.date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const typeLabels = {
          'transfer_out': 'Trans. Env.',
          'transfer_in': 'Trans. Rec.',
          'deposit': 'Depósito',
          'withdrawal': 'Retiro'
        };
        const type = typeLabels[mov.type] || mov.type;
        const description = (mov.description || 'Sin descripción').substring(0, 30);
        const isNegative = ['transfer_out', 'withdrawal'].includes(mov.type);
        const amount = `${isNegative ? '-' : '+'}$${Number(mov.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const balance = `$${Number(mov.balance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        doc
          .fontSize(7)
          .fillColor('#333333');

        doc.text(date, 50, currentY, { width: 70 });
        doc.text(type, 125, currentY, { width: 60 });
        doc.text(description, 190, currentY, { width: 150 });
        doc.fillColor(isNegative ? '#d32f2f' : '#388e3c').text(amount, 345, currentY, { width: 70, align: 'right' });
        doc.fillColor('#333333').text(balance, 425, currentY, { width: 80, align: 'right' });

        currentY += 18;
      });

      if (data.movements.length > 30) {
        doc.moveDown(1);
        doc
          .fontSize(8)
          .fillColor('#666666')
          .text(`Mostrando los últimos 30 de ${data.movements.length} movimientos totales`, 50, currentY, { align: 'center' });
      }

      // ==================== FOOTER ====================
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 80;

      doc
        .fontSize(7)
        .fillColor('#999999')
        .text('Este estado de cuenta es válido sin firma autógrafa.', 50, footerY, { align: 'center', width: 500 });

      doc
        .fontSize(7)
        .text('Banco JETY - Institución Bancaria | www.bancojety.com', { align: 'center', width: 500 });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateTransferPDF,
  generateDepositPDF,
  generateAccountStatementPDF
};
