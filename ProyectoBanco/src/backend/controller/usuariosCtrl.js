const db = require('../db');

// Obtener todos los main
const getMain = (req, res) => {
  db.query('SELECT * FROM main', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

// Obtener todos los customers
const getCustomers = (req, res) => {
  const query = `
    SELECT m.mainId, m.mail, m.rol,
           c.phoneNumber, c.firstName, c.lastNameP, c.lastNameM,
           c.birthday, c.address, c.curp, c.rfc, c.balance,
           c.cardNum, c.creditCardNum
    FROM main m
    INNER JOIN customer c ON m.mainId = c.mainId
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

// Obtener todos los empleados
const getEmployees = (req, res) => {
  const query = `
    SELECT m.mainId, m.mail, m.rol,
           e.phoneNumber, e.firstName, e.lastNameP, e.lastNameM,
           e.birthday, e.address, e.curp, e.rfc, e.nss
    FROM main m
    INNER JOIN employee e ON m.mainId = e.mainId
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

// Obtener un usuario por id
const getUsuario = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT m.mainId, m.mail, m.rol,
           c.firstName AS customerName, e.firstName AS employeeName
    FROM main m
    LEFT JOIN customer c ON m.mainId = c.mainId
    LEFT JOIN employee e ON m.mainId = e.mainId
    WHERE m.mainId = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0] || {});
  });
};

const login = (req, res) => {
  console.log('Login request body:', req.body);
  const mail = req.body.mail;
  // Support both 'pass' (backend legacy) and 'password' (frontend)
  const pass = req.body.pass ?? req.body.password;

  if (!mail || !pass) {
    console.warn('Campos faltantes en login:', { mail, pass });
    return res.status(400).json({ msg: 'Faltan campos mail o password' });
  }

  const query = 'SELECT * FROM main WHERE mail = ? AND pass = ?';
  db.query(query, [mail, pass], (err, results) => {
    if (err) {
      console.error('Error en consulta login:', err);
      return res.status(500).send(err);
    }
    if (!results || results.length === 0) {
        console.log('Credenciales no encontradas para mail:', mail);
        return res.status(401).json({ success: false, msg: 'Usuario o contraseña incorrectos' });
    }
      console.log('Login exitoso para mail:', mail, 'rol:', results[0].rol);
      // Build a minimal, normalized response to avoid frontend ambiguity
      const user = {
        mainId: results[0].mainId,
        mail: results[0].mail,
        rol: results[0].rol
      };
      const response = { success: true, rol: results[0].rol, user };
      console.log('Enviando respuesta de login:', response);
      res.json(response);
  });
};

module.exports = { getMain, getCustomers, getEmployees, getUsuario, login };

