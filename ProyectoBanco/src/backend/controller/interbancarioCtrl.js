/**
 * Controlador para transferencias interbancarias
 * Maneja la recepción de transferencias desde otros bancos
 */

const db = require('../db');

/**
 * Recibir transferencia de otro banco → Banco JETY
 * Endpoint: POST /api/interbancaria/recibir
 */
exports.recibirTransferencia = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    console.log('[INTERBANK] 🔵 Recibiendo transferencia...');
    console.log('[INTERBANK] Banco origen:', req.bankInfo?.name);
    console.log('[INTERBANK] Body:', JSON.stringify(req.body));
    
    const {
      fromBank,      // Banco origen (ej: "Dream Wallet")
      fromAccount,   // Cuenta origen
      toClabe,       // CLABE destino en Banco JETY
      amount,        // Monto
      concept,       // Concepto
      reference      // Referencia
    } = req.body;
    
    // Validaciones de campos obligatorios
    if (!toClabe || !amount || amount <= 0) {
      console.error('[INTERBANK] ❌ Parámetros inválidos');
      return res.status(400).json({
        success: false,
        error: 'CLABE destino y monto son obligatorios',
        code: 'INVALID_PARAMS'
      });
    }
    
    // Valores por defecto para campos opcionales
    const bancoOrigen = fromBank || req.bankInfo?.name || 'Banco Externo';
    const cuentaOrigen = fromAccount || 'EXTERNA';
    const concepto = concept || `Transferencia desde ${bancoOrigen}`;
    const referencia = reference || `EXT-${Date.now()}`;
    
    await connection.beginTransaction();
    
    // Buscar cuenta destino en Banco JETY por CLABE
    const [cuentaDestino] = await connection.query(
      'SELECT accountId, accNum, balance FROM cAccount WHERE clabe = ?',
      [toClabe]
    );
    
    if (!cuentaDestino.length) {
      await connection.rollback();
      console.error('[INTERBANK] ❌ CLABE no encontrada:', toClabe);
      return res.status(404).json({
        success: false,
        error: 'CLABE destino no encontrada en Banco JETY',
        code: 'CLABE_NOT_FOUND'
      });
    }
    
    const cuenta = cuentaDestino[0];
    const montoNumerico = parseFloat(amount);
    
    console.log('[INTERBANK] ✅ Cuenta encontrada:', cuenta.accNum);
    console.log('[INTERBANK] Saldo actual:', cuenta.balance);
    console.log('[INTERBANK] Monto a acreditar:', montoNumerico);
    
    // Actualizar balance de cuenta destino
    await connection.query(
      'UPDATE cAccount SET balance = balance + ? WHERE accountId = ?',
      [montoNumerico, cuenta.accountId]
    );
    
    console.log('[INTERBANK] ✅ Saldo acreditado');
    
    // Registrar en tabla transfer
    const [result] = await connection.query(
      `INSERT INTO transfer 
       (origin, banco_origen, destiny, banco_destino, ammount, fee, description, doDate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [
        cuentaOrigen,
        bancoOrigen,
        cuenta.accNum,
        'Banco JETY',
        montoNumerico,
        0, // Sin comisión para transferencias entrantes
        `${concepto} - Ref: ${referencia}`
      ]
    );
    
    const transferenciaId = result.insertId;
    
    console.log('[INTERBANK] ✅ Registro guardado, ID:', transferenciaId);
    
    await connection.commit();
    
    const nuevoBalance = parseFloat(cuenta.balance) + montoNumerico;
    
    console.log('[INTERBANK] ✅ Transferencia completada');
    console.log('[INTERBANK] Nuevo saldo:', nuevoBalance);
    
    res.status(200).json({
      success: true,
      transaccionId: transferenciaId,
      cuentaDestino: cuenta.accNum,
      montoAcreditado: montoNumerico,
      nuevoBalance: nuevoBalance.toFixed(2),
      message: 'Transferencia recibida y procesada exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('[INTERBANK] ❌ Error al procesar transferencia:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error al procesar transferencia interbancaria',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

/**
 * Health check para verificar disponibilidad del servicio
 * Endpoint: GET /api/interbancaria/health
 */
exports.healthCheck = (req, res) => {
  res.json({
    success: true,
    service: 'Banco JETY - API Interbancaria',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
};
