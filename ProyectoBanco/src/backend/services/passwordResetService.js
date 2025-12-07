// Almacenamiento temporal de tokens de recuperación
const resetTokens = new Map();

const passwordResetService = {
  generateResetToken: (mail) => {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    
    console.log('[TOKEN-SERVICE] Generando token para:', mail);
    console.log('[TOKEN-SERVICE] Token:', token);
    
    resetTokens.set(token, {
      mail: mail,
      expiresAt: expiresAt,
      used: false
    });
    
    console.log('[TOKEN-SERVICE] Token guardado. Total tokens:', resetTokens.size);
    return token;
  },

  verifyResetToken: (token, mail) => {
    console.log('[TOKEN-SERVICE] Verificando token:', token, 'para:', mail);
    
    const tokenData = resetTokens.get(token);
    
    if (!tokenData) {
      console.log('[TOKEN-SERVICE] Token no encontrado');
      return { valid: false, reason: 'Token no encontrado o inválido' };
    }
    
    console.log('[TOKEN-SERVICE] Token encontrado:', tokenData);
    
    if (tokenData.mail !== mail) {
      console.log('[TOKEN-SERVICE] Token no corresponde al correo');
      return { valid: false, reason: 'Token no válido para este correo' };
    }
    
    if (tokenData.used) {
      console.log('[TOKEN-SERVICE] Token ya fue usado');
      return { valid: false, reason: 'El token ya fue utilizado' };
    }
    
    if (Date.now() > tokenData.expiresAt) {
      console.log('[TOKEN-SERVICE] Token expirado');
      resetTokens.delete(token);
      return { valid: false, reason: 'El token ha expirado' };
    }
    
    console.log('[TOKEN-SERVICE] Token válido');
    return { valid: true, reason: 'Token válido' };
  },

  markTokenAsUsed: (token) => {
    console.log('[TOKEN-SERVICE] Marcando token como usado:', token);
    const tokenData = resetTokens.get(token);
    if (tokenData) {
      tokenData.used = true;
      console.log('[TOKEN-SERVICE] Token marcado como usado');
    }
  },

  cleanExpiredTokens: () => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [token, data] of resetTokens.entries()) {
      if (now > data.expiresAt || data.used) {
        resetTokens.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log('[TOKEN-SERVICE] Tokens limpiados:', cleaned);
    }
  }
};

setInterval(() => {
  passwordResetService.cleanExpiredTokens();
}, 5 * 60 * 1000);

module.exports = passwordResetService;