/**
 * Rutas para API interbancaria
 * Endpoints para recibir transferencias de otros bancos
 */

const express = require('express');
const router = express.Router();
const interbancarioCtrl = require('../controller/interbancarioCtrl');
const authenticateAPIKey = require('../middleware/apiKeyAuth');

// Health check (sin autenticación)
router.get('/health', interbancarioCtrl.healthCheck);

// Recibir transferencia de otro banco (requiere autenticación)
router.post('/recibir', authenticateAPIKey, interbancarioCtrl.recibirTransferencia);

module.exports = router;
