/**
 * Cliente HTTP para comunicarse con Dream Wallet
 * Maneja el envío de transferencias hacia Dream Wallet
 */

const axios = require('axios');

// Obtener configuración de variables de entorno
const DREAM_WALLET_URL = process.env.DREAM_WALLET_API_URL || 'http://3.130.29.73:3000/api/interbank/recibir';
const API_KEY = process.env.DREAM_WALLET_API_KEY || 'jety_api_key_abc123';

class DreamWalletAPI {
  
  /**
   * Enviar transferencia A Dream Wallet
   * @param {Object} data - Datos de la transferencia
   * @param {string} data.cuentaOrigen - Cuenta origen en Banco JETY
   * @param {string} data.clabeDestino - CLABE destino en Dream Wallet
   * @param {number} data.monto - Monto a transferir
   * @param {string} data.concepto - Concepto de la transferencia
   * @returns {Promise<Object>} Respuesta del servidor Dream Wallet
   */
  static async enviarTransferencia(data) {
    try {
      console.log('[DREAM WALLET API] 🔵 Enviando transferencia...');
      console.log('[DREAM WALLET API] Monto:', data.monto);
      console.log('[DREAM WALLET API] Destino:', data.clabeDestino);
      
      const payload = {
        fromBank: 'Banco JETY',
        fromAccount: data.cuentaOrigen || 'CUENTA_JETY',
        toClabe: data.clabeDestino,
        amount: parseFloat(data.monto),
        concept: data.concepto || 'Transferencia desde Banco JETY',
        reference: data.referencia || `JETY-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      console.log('[DREAM WALLET API] Payload:', JSON.stringify(payload));
      
      const response = await axios.post(
        DREAM_WALLET_URL,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          timeout: 15000 // 15 segundos de timeout
        }
      );
      
      console.log('[DREAM WALLET API] ✅ Respuesta exitosa:', response.data);
      
      return {
        success: true,
        data: response.data,
        message: 'Transferencia enviada a Dream Wallet exitosamente'
      };
      
    } catch (error) {
      console.error('[DREAM WALLET API] ❌ Error:', error.message);
      
      if (error.response) {
        // Error de respuesta del servidor
        console.error('[DREAM WALLET API] Status:', error.response.status);
        console.error('[DREAM WALLET API] Data:', error.response.data);
        
        return {
          success: false,
          error: error.response.data?.error || error.response.data?.message || 'Error en Dream Wallet',
          code: error.response.data?.code || 'DREAM_WALLET_ERROR',
          status: error.response.status
        };
      } else if (error.request) {
        // No hubo respuesta del servidor
        console.error('[DREAM WALLET API] Sin respuesta del servidor');
        return {
          success: false,
          error: 'No se pudo conectar con Dream Wallet. Verifica que el servidor esté activo.',
          code: 'CONNECTION_ERROR'
        };
      } else {
        // Error al configurar la petición
        console.error('[DREAM WALLET API] Error de configuración:', error.message);
        return {
          success: false,
          error: error.message,
          code: 'REQUEST_ERROR'
        };
      }
    }
  }
  
  /**
   * Verificar conectividad con Dream Wallet
   * @returns {Promise<boolean>}
   */
  static async verificarConexion() {
    try {
      console.log('[DREAM WALLET API] Verificando conexión...');
      const response = await axios.get(
        DREAM_WALLET_URL.replace('/recibir', '/health'),
        {
          headers: { 'x-api-key': API_KEY },
          timeout: 5000
        }
      );
      console.log('[DREAM WALLET API] ✅ Conexión exitosa');
      return true;
    } catch (error) {
      console.error('[DREAM WALLET API] ❌ Error de conexión:', error.message);
      return false;
    }
  }
}

module.exports = DreamWalletAPI;
