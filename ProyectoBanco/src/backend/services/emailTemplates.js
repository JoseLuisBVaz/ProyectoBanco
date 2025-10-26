// ==================== PLANTILLAS DE EMAIL ====================
// Plantillas HTML para los diferentes tipos de correos

const emailTemplates = {
  
  // ==================== PLANTILLA BASE ====================
  baseTemplate: (content, title = 'Banco JETY') => `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          background: linear-gradient(135deg, #072146 0%, #0a3768 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .email-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 600;
          letter-spacing: 2px;
        }
        .email-body {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .email-footer {
          background-color: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #666666;
          border-top: 1px solid #e0e0e0;
        }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          margin: 20px 0;
          background-color: #072146;
          color: #ffffff;
          text-decoration: none;
          border-radius: 5px;
          font-weight: 600;
        }
        .btn:hover {
          background-color: #0a3768;
        }
        .info-box {
          background-color: #f8f9fa;
          border-left: 4px solid #072146;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .amount {
          font-size: 36px;
          font-weight: bold;
          color: #072146;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-label {
          font-weight: 600;
          color: #666666;
        }
        .detail-value {
          color: #333333;
        }
        .alert {
          background-color: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>BANCO JETY</h1>
        </div>
        ${content}
        <div class="email-footer">
          <p><strong>Banco JETY</strong> - Tu banco de confianza</p>
          <p>Este correo fue generado automáticamente. Por favor no responder.</p>
          <p>Si no solicitaste esta acción, contacta inmediatamente a soporte.</p>
          <p style="margin-top: 10px;">
            <a href="#" style="color: #072146; text-decoration: none; margin: 0 10px;">Centro de Ayuda</a> |
            <a href="#" style="color: #072146; text-decoration: none; margin: 0 10px;">Políticas de Privacidad</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  // ==================== TRANSFERENCIA ENVIADA ====================
  transferSent: (data) => {
    const { 
      customerName, 
      amount, 
      destinationAccount, 
      destinationName,
      description, 
      tranId, 
      date, 
      fee,
      newBalance 
    } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #072146;">Transferencia Realizada</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>Tu transferencia ha sido procesada exitosamente:</p>
        
        <div class="amount" style="color: #dc3545;">-$${parseFloat(amount).toFixed(2)} MXN</div>
        
        <div class="info-box">
          <div class="detail-row">
            <span class="detail-label">Cuenta destino:</span>
            <span class="detail-value">${destinationAccount}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Beneficiario:</span>
            <span class="detail-value">${destinationName || 'No especificado'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Concepto:</span>
            <span class="detail-value">${description || 'Sin descripción'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Comisión:</span>
            <span class="detail-value">$${parseFloat(fee || 0).toFixed(2)} MXN</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Folio:</span>
            <span class="detail-value">#${String(tranId).padStart(10, '0')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${date}</span>
          </div>
          ${newBalance !== undefined ? `
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Nuevo saldo:</span>
            <span class="detail-value" style="font-weight: bold; color: #072146;">$${parseFloat(newBalance).toFixed(2)} MXN</span>
          </div>
          ` : ''}
        </div>
        
        <p style="margin-top: 30px;">Puedes consultar más detalles en tu portal bancario.</p>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Transferencia Realizada - Banco JETY');
  },

  // ==================== TRANSFERENCIA RECIBIDA ====================
  transferReceived: (data) => {
    const { 
      customerName, 
      amount, 
      originAccount, 
      originName,
      description, 
      tranId, 
      date,
      newBalance 
    } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #072146;">Transferencia Recibida</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>Has recibido una transferencia en tu cuenta:</p>
        
        <div class="amount" style="color: #28a745;">+$${parseFloat(amount).toFixed(2)} MXN</div>
        
        <div class="info-box">
          <div class="detail-row">
            <span class="detail-label">Cuenta origen:</span>
            <span class="detail-value">${originAccount}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Remitente:</span>
            <span class="detail-value">${originName || 'No especificado'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Concepto:</span>
            <span class="detail-value">${description || 'Sin descripción'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Folio:</span>
            <span class="detail-value">#${String(tranId).padStart(10, '0')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${date}</span>
          </div>
          ${newBalance !== undefined ? `
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Nuevo saldo:</span>
            <span class="detail-value" style="font-weight: bold; color: #072146;">$${parseFloat(newBalance).toFixed(2)} MXN</span>
          </div>
          ` : ''}
        </div>
        
        <p style="margin-top: 30px;">El dinero está disponible inmediatamente en tu cuenta.</p>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Transferencia Recibida - Banco JETY');
  },

  // ==================== RECUPERACIÓN DE CONTRASEÑA ====================
  passwordReset: (data) => {
    const { customerName, resetToken, resetLink, expirationTime } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #072146;">Recuperación de Contraseña</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        
        <div class="alert">
          <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá sin cambios.
        </div>
        
        <p>Para restablecer tu contraseña, haz clic en el siguiente botón:</p>
        
        <div style="text-align: center;">
          <a href="${resetLink}" class="btn">Restablecer Contraseña</a>
        </div>
        
        <p style="margin-top: 30px;">O copia y pega este enlace en tu navegador:</p>
        <div class="info-box">
          <a href="${resetLink}" style="color: #072146; word-break: break-all;">${resetLink}</a>
        </div>
        
        <div class="info-box" style="margin-top: 30px;">
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Código de verificación:</span>
            <span class="detail-value" style="font-size: 18px; font-weight: bold; color: #072146;">${resetToken}</span>
          </div>
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Válido hasta:</span>
            <span class="detail-value">${expirationTime}</span>
          </div>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Por seguridad, este enlace expirará en ${expirationTime}. Después de ese tiempo, necesitarás solicitar un nuevo enlace.
        </p>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Recuperación de Contraseña - Banco JETY');
  },

  // ==================== CONFIRMACIÓN DE CAMBIO DE CONTRASEÑA ====================
  passwordChanged: (data) => {
    const { customerName, date, ipAddress } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #072146;">Contraseña Actualizada</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>Tu contraseña ha sido cambiada exitosamente.</p>
        
        <div class="info-box">
          <div class="detail-row">
            <span class="detail-label">Fecha del cambio:</span>
            <span class="detail-value">${date}</span>
          </div>
          ${ipAddress ? `
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Dirección IP:</span>
            <span class="detail-value">${ipAddress}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="alert">
          <strong>⚠️ ¿No fuiste tú?</strong><br>
          Si no realizaste este cambio, tu cuenta puede estar comprometida. Contacta inmediatamente a nuestro soporte.
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="#" class="btn">Contactar Soporte</a>
        </div>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Contraseña Actualizada - Banco JETY');
  },

  // ==================== NUEVA CUENTA CREADA ====================
  accountCreated: (data) => {
    const { customerName, accountType, cardNum, accNum, clabe, date } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #072146;">Nueva Cuenta Creada</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>¡Felicidades! Se ha creado una nueva cuenta a tu nombre.</p>
        
        <div class="info-box">
          <div class="detail-row">
            <span class="detail-label">Tipo de cuenta:</span>
            <span class="detail-value">${accountType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Número de tarjeta:</span>
            <span class="detail-value">${cardNum}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Número de cuenta:</span>
            <span class="detail-value">${accNum}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">CLABE:</span>
            <span class="detail-value">${clabe}</span>
          </div>
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Fecha de creación:</span>
            <span class="detail-value">${date}</span>
          </div>
        </div>
        
        <p style="margin-top: 30px;">Ya puedes comenzar a utilizar tu nueva cuenta.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="#" class="btn">Ir al Portal</a>
        </div>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Nueva Cuenta Creada - Banco JETY');
  },

  // ==================== BIENVENIDA ====================
  welcome: (data) => {
    const { customerName, mail } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #072146;">¡Bienvenido a Banco JETY!</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>Gracias por confiar en nosotros. Tu cuenta ha sido creada exitosamente.</p>
        
        <div class="info-box">
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label">Correo registrado:</span>
            <span class="detail-value">${mail}</span>
          </div>
        </div>
        
        <p style="margin-top: 30px;">Ahora puedes disfrutar de todos nuestros servicios bancarios:</p>
        <ul style="line-height: 2;">
          <li>✅ Transferencias en tiempo real</li>
          <li>✅ Consulta de saldos y movimientos</li>
          <li>✅ Gestión de múltiples cuentas</li>
          <li>✅ Comprobantes digitales</li>
          <li>✅ Soporte 24/7</li>
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:4200" class="btn">Acceder al Portal</a>
        </div>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Bienvenido - Banco JETY');
  },

  // ==================== DEPÓSITO RECIBIDO ====================
  depositReceived: (data) => {
    const { 
      customerName, 
      amount, 
      accountNumber,
      description = 'Depósito en efectivo', 
      depId,
      date,
      newBalance 
    } = data;
    
    const content = `
      <div class="email-body">
        <h2 style="color: #28a745;">💰 Depósito Recibido</h2>
        <p>Hola <strong>${customerName}</strong>,</p>
        <p>Se ha registrado un depósito en tu cuenta.</p>
        
        <div class="amount" style="color: #28a745;">
          + $${Number(amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        
        <div class="info-box">
          <div class="detail-row">
            <span class="detail-label">ID de depósito:</span>
            <span class="detail-value">#${depId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Cuenta destino:</span>
            <span class="detail-value">${accountNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Concepto:</span>
            <span class="detail-value">${description}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${date}</span>
          </div>
          <div class="detail-row" style="border-bottom: none;">
            <span class="detail-label"><strong>Nuevo saldo:</strong></span>
            <span class="detail-value"><strong>$${Number(newBalance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          </div>
        </div>
        
        <p style="margin-top: 30px;">El depósito se ha acreditado exitosamente en tu cuenta.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="#" class="btn">Ver Detalles</a>
        </div>
      </div>
    `;
    
    return emailTemplates.baseTemplate(content, 'Depósito Recibido - Banco JETY');
  }
};

module.exports = emailTemplates;
