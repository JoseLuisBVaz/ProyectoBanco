// ==================== SERVICIO DE RECUPERACIÓN DE CONTRASEÑA ====================
// Gestión de tokens y funciones relacionadas con recuperación de contraseña

const crypto = require('crypto');

// Almacenamiento temporal de tokens (en producción, usar Redis o base de datos)
const resetTokens = new Map();

/**
 * Genera un token de recuperación de contraseña
 * @param {string} mail - Email del usuario
 * @returns {Object} - Token y tiempo de expiración
 */
const generateResetToken = (mail) => {
  // Generar token aleatorio de 6 dígitos
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Token expira en 15 minutos
  const expiresAt = Date.now() + 15 * 60 * 1000;
  
  // Guardar token con email asociado
  resetTokens.set(token, {
    mail: mail,
    expiresAt: expiresAt,
    used: false
  });
  
  console.log(`🔐 [PASSWORD-RESET] Token generado para ${mail}: ${token}`);
  
  return {
    token: token,
    expiresAt: new Date(expiresAt)
  };
};

/**
 * Verifica si un token es válido
 * @param {string} token - Token a verificar
 * @param {string} mail - Email del usuario
 * @returns {Object} - Resultado de la verificación
 */
const verifyResetToken = (token, mail) => {
  const tokenData = resetTokens.get(token);
  
  if (!tokenData) {
    return { valid: false, reason: 'Token no encontrado' };
  }
  
  if (tokenData.used) {
    return { valid: false, reason: 'Token ya fue utilizado' };
  }
  
  if (tokenData.mail !== mail) {
    return { valid: false, reason: 'Token no corresponde al usuario' };
  }
  
  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(token);
    return { valid: false, reason: 'Token expirado' };
  }
  
  return { valid: true };
};

/**
 * Marca un token como usado
 * @param {string} token - Token a marcar
 */
const markTokenAsUsed = (token) => {
  const tokenData = resetTokens.get(token);
  if (tokenData) {
    tokenData.used = true;
    resetTokens.set(token, tokenData);
    
    // Eliminar el token después de 1 hora
    setTimeout(() => {
      resetTokens.delete(token);
      console.log(`🗑️ [PASSWORD-RESET] Token ${token} eliminado`);
    }, 60 * 60 * 1000);
  }
};

/**
 * Limpia tokens expirados (ejecutar periódicamente)
 */
const cleanExpiredTokens = () => {
  const now = Date.now();
  let deletedCount = 0;
  
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiresAt) {
      resetTokens.delete(token);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`🧹 [PASSWORD-RESET] ${deletedCount} tokens expirados eliminados`);
  }
};

// Ejecutar limpieza cada 10 minutos
setInterval(cleanExpiredTokens, 10 * 60 * 1000);

module.exports = {
  generateResetToken,
  verifyResetToken,
  markTokenAsUsed,
  cleanExpiredTokens
};
