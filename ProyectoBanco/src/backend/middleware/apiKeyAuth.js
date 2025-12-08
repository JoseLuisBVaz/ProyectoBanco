/**
 * Middleware de autenticación por API Key
 * Valida que otros bancos tengan una API Key válida para acceder a nuestros endpoints
 */

const AUTHORIZED_BANKS = require('../config/bancos-autorizados');

const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Verificar que se envió la API Key
  if (!apiKey) {
    console.error('[API AUTH] ❌ API Key faltante');
    return res.status(401).json({
      success: false,
      error: 'API Key requerida en header x-api-key',
      code: 'MISSING_API_KEY'
    });
  }
  
  // Verificar que la API Key existe y está activa
  const bank = AUTHORIZED_BANKS[apiKey];
  
  if (!bank || !bank.active) {
    console.error('[API AUTH] ❌ API Key inválida o inactiva:', apiKey);
    return res.status(403).json({
      success: false,
      error: 'API Key inválida o banco no autorizado',
      code: 'INVALID_API_KEY'
    });
  }
  
  // API Key válida - agregar información del banco al request
  req.bankInfo = bank;
  console.log(`[API AUTH] ✅ Autenticado: ${bank.name}`);
  
  next();
};

module.exports = authenticateAPIKey;
