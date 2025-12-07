// ==================== CONFIGURACIÓN DE EMAIL ====================
// Archivo de configuración centralizado para el servicio de correo

module.exports = {
  // Configuración del servicio de correo (Gmail, Outlook, etc.)
  service: 'gmail', // Puedes cambiar a 'outlook', 'yahoo', etc.
  
  // Credenciales del correo (usar variables de entorno en producción)
  auth: {
    user: process.env.EMAIL_USER || 'punguis222@gmail.com', // Cambiar por tu correo
    pass: process.env.EMAIL_PASS || 'vgah unmx dgxd wfiu'      // Usar App Password de Gmail
  },
  
  // Configuración del remitente
  from: {
    name: 'Banco JETY',
    address: process.env.EMAIL_USER || 'punguis222@gmail.com'
  },
  
  // URLs del sistema (para links en correos)
  urls: {
    resetPassword: process.env.RESET_PASSWORD_URL || 'http://localhost:4200/reset-password',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:4200/main',
    support: process.env.SUPPORT_URL || 'http://localhost:4200/support'
  },
  
  // Configuración de reintentos
  retries: {
    maxAttempts: 3,
    delay: 1000 // milisegundos
  }
};
