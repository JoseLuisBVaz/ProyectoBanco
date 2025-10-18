const express = require('express');
const router = express.Router();
// Nota: el controlador está en ../controller (singular)
const { getMain, getCustomers, getEmployees, getUsuario, login, registerUser, getAccountsByUser } = require('../controller/usuariosCtrl');

// Rutas de solo consulta
router.get('/main', getMain);
router.get('/customers', getCustomers);
router.get('/employees', getEmployees);
router.get('/usuario/:id', getUsuario);
router.get('/accounts/:mainId', getAccountsByUser);
// Ruta de login
router.post('/login', login);
// Ruta de registro
router.post('/register', registerUser);

module.exports = router;
