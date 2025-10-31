// ==================== SERVICIO DE EMAIL ====================
// Servicio centralizado para envío de correos con Nodemailer

const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');
const emailTemplates = require('./emailTemplates');
const pdfService = require('./pdfService');

// ==================== CONFIGURACIÓN DEL TRANSPORTER ====================
let transporter = null;

const createTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: emailConfig.service,
      auth: emailConfig.auth,
      tls: {
        rejectUnauthorized: false // Para desarrollo, en producción cambiar a true
      }
    });
    
    console.log('📧 [EMAIL] Transporter de correo configurado');
  }
  return transporter;
};

// ==================== FUNCIÓN PRINCIPAL DE ENVÍO ====================
/**
 * Envía un correo electrónico con reintentos
 * @param {Object} mailOptions - Opciones del correo (to, subject, html)
 * @param {number} attempt - Intento actual (para reintentos)
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendEmail = async (mailOptions, attempt = 1) => {
  try {
    const transporter = createTransporter();
    
    // Agregar información del remitente
    const completeMailOptions = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      ...mailOptions
    };
    
    console.log(`📧 [EMAIL] Enviando correo a: ${mailOptions.to} (Intento ${attempt}/${emailConfig.retries.maxAttempts})`);
    
    const info = await transporter.sendMail(completeMailOptions);
    
    console.log(`✅ [EMAIL] Correo enviado exitosamente - ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
    
  } catch (error) {
    console.error(`❌ [EMAIL] Error al enviar correo (Intento ${attempt}):`, error.message);
    
    // Reintentar si no se alcanzó el máximo de intentos
    if (attempt < emailConfig.retries.maxAttempts) {
      console.log(`🔄 [EMAIL] Reintentando en ${emailConfig.retries.delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, emailConfig.retries.delay));
      return sendEmail(mailOptions, attempt + 1);
    }
    
    // Si falló después de todos los intentos
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// ==================== FUNCIONES ESPECÍFICAS POR TIPO DE CORREO ====================

/**
 * Envía correo de transferencia enviada
 */
const sendTransferSentEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de transferencia enviada');
    
    const html = emailTemplates.transferSent(data);
    
    // Generar PDF del comprobante
    const pdfBuffer = await pdfService.generateTransferPDF(data);
    const folioId = String(data.tranId).padStart(10, '0');
    
    const mailOptions = {
      to: recipientEmail,
      subject: `Transferencia Enviada - Folio #${folioId}`,
      html: html,
      attachments: [
        {
          filename: `Comprobante_Transferencia_${folioId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendTransferSentEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía correo de transferencia recibida
 */
const sendTransferReceivedEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de transferencia recibida');
    
    const html = emailTemplates.transferReceived(data);
    
    // Generar PDF del comprobante
    const pdfBuffer = await pdfService.generateTransferPDF(data);
    const folioId = String(data.tranId).padStart(10, '0');
    
    const mailOptions = {
      to: recipientEmail,
      subject: `Transferencia Recibida - Folio #${folioId}`,
      html: html,
      attachments: [
        {
          filename: `Comprobante_Transferencia_${folioId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendTransferReceivedEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía correo de recuperación de contraseña
 */
const sendPasswordResetEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de recuperación de contraseña');
    
    const html = emailTemplates.passwordReset(data);
    
    const mailOptions = {
      to: recipientEmail,
      subject: '🔐 Recuperación de Contraseña - Banco JETY',
      html: html
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendPasswordResetEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía correo de confirmación de cambio de contraseña
 */
const sendPasswordChangedEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de contraseña cambiada');
    
    const html = emailTemplates.passwordChanged(data);
    
    const mailOptions = {
      to: recipientEmail,
      subject: '✅ Contraseña Actualizada - Banco JETY',
      html: html
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendPasswordChangedEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía correo de nueva cuenta creada
 */
const sendAccountCreatedEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de cuenta creada');
    
    const html = emailTemplates.accountCreated(data);
    
    const mailOptions = {
      to: recipientEmail,
      subject: '🎉 Nueva Cuenta Creada - Banco JETY',
      html: html
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendAccountCreatedEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía correo de bienvenida
 */
const sendWelcomeEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de bienvenida');
    
    const html = emailTemplates.welcome(data);
    
    const mailOptions = {
      to: recipientEmail,
      subject: '👋 ¡Bienvenido a Banco JETY!',
      html: html
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendWelcomeEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía correo de depósito recibido
 * @param {string} recipientEmail - Email del destinatario
 * @param {object} data - Datos del depósito
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendDepositReceivedEmail = async (recipientEmail, data) => {
  try {
    console.log('📧 [EMAIL] Preparando correo de depósito recibido');
    
    const html = emailTemplates.depositReceived(data);
    
    // Generar PDF del comprobante
    const pdfBuffer = await pdfService.generateDepositPDF(data);
    const folioId = String(data.depId).padStart(10, '0');
    
    const mailOptions = {
      to: recipientEmail,
      subject: '💰 Depósito Recibido - Banco JETY',
      html: html,
      attachments: [
        {
          filename: `Comprobante_Deposito_${folioId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('❌ [EMAIL] Error en sendDepositReceivedEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica la conexión con el servidor de correo
 */
const verifyConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ [EMAIL] Conexión con servidor de correo verificada');
    return { success: true, message: 'Servidor de correo listo' };
  } catch (error) {
    console.error('❌ [EMAIL] Error al verificar conexión:', error);
    return { success: false, error: error.message };
  }
};

// ==================== EMAIL DE RETIRO SIN TARJETA ====================
/**
 * Envía correo de confirmación de retiro sin tarjeta
 * @param {string} recipientEmail - Email del destinatario
 * @param {Object} data - Datos del retiro (codigo, amount, accNum, withdrawDate, etc.)
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendWithdrawalCodeEmail = async (recipientEmail, data) => {
  try {
    console.log('[EMAIL] Preparando correo de retiro sin tarjeta');
    
    const htmlContent = emailTemplates.withdrawalCodeTemplate(data);
    
    const mailOptions = {
      to: recipientEmail,
      subject: 'Código de Retiro Sin Tarjeta - Banco JETY',
      html: htmlContent
    };
    
    return await sendEmail(mailOptions);
  } catch (error) {
    console.error('[EMAIL] Error al enviar correo de retiro:', error);
    throw error;
  }
};

// ==================== EXPORTS ====================
module.exports = {
  sendTransferSentEmail,
  sendTransferReceivedEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountCreatedEmail,
  sendWelcomeEmail,
  sendDepositReceivedEmail,
  sendWithdrawalCodeEmail,
  verifyConnection,
  sendEmail // Export genérico para casos personalizados
};
