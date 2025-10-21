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
  createAccount,
  generateReceipt
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

// === TRANSFERENCIAS ===
router.post('/transfer', transferFunds);

// === CREACIÓN DE CUENTAS ===
router.post('/create-account', createAccount);

// === COMPROBANTES ===
router.get('/receipt/:tranId', generateReceipt);

module.exports = router;
