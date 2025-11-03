const express = require('express');
const router = express.Router();
const { 
  getMain, 
  getCustomers, 
  getEmployees, 
  getUsuario, 
  login, 
  registerUser, 
  getAccountsByUser, 
  transferFunds,
  depositFunds,
  createAccount,
  generateReceipt,
  generateTransferPDF,
  generateDepositPDF,
  requestPasswordReset,
  resetPassword,
  crearRetiroSinTarjeta,
  getRetirosRecientes,
  validarCodigoRetiro,
  procesarRetiroConCodigo,
  getAccountStatement
} = require('../controller/usuariosCtrl');

// === RUTAS DE CONSULTA ===
router.get('/health', (req, res) => res.json({ ok: true }));
router.get('/main', getMain);
router.get('/customers', getCustomers);
router.get('/employees', getEmployees);
router.get('/usuario/:id', getUsuario);
router.get('/accounts/:mainId', getAccountsByUser);

// === AUTENTICACIÓN ===
router.post('/login', login);
router.post('/register', registerUser);

// === RECUPERACIÓN DE CONTRASEÑA ===
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/reset', resetPassword);

// === TRANSFERENCIAS ===
router.post('/transfer', transferFunds);

// === DEPÓSITOS ===
router.post('/deposit', depositFunds);

// === RETIROS SIN TARJETA ===
router.post('/retiro-sin-tarjeta', crearRetiroSinTarjeta);
router.get('/retiros-recientes/:mainId', getRetirosRecientes);
router.post('/validar-codigo-retiro', validarCodigoRetiro);
router.post('/procesar-retiro-codigo', procesarRetiroConCodigo);

// === CREACIÓN DE CUENTAS ===
router.post('/create-account', createAccount);

// === COMPROBANTES ===
router.get('/receipt/:tranId', generateReceipt);

// === PDF DOWNLOADS ===
router.get('/transfer-pdf/:tranId', generateTransferPDF);
router.get('/deposit-pdf/:depId', generateDepositPDF);

// === ESTADO DE CUENTA ===
router.get('/account-statement/:accountId', getAccountStatement);

module.exports = router;
