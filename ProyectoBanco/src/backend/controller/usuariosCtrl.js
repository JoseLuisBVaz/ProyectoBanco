const db = require('../db');
const bcrypt = require('bcrypt');

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

const login = async (req, res) => {
  console.log('[LOGIN] Iniciando proceso de login');
  console.log('[LOGIN] Request body:', req.body);
  const mail = req.body.mail;
  // Support both 'pass' (backend legacy) and 'password' (frontend)
  const pass = req.body.pass ?? req.body.password;

  if (!mail || !pass) {
    console.warn('[LOGIN] Campos faltantes en login:', { mail, pass });
    return res.status(400).json({ msg: 'Faltan campos mail o password' });
  }

  console.log('[LOGIN] Contraseña recibida (longitud):', pass.length);
  console.log('[LOGIN] Email a buscar:', mail);

  // Buscar usuario por email primero
  const query = 'SELECT * FROM main WHERE mail = ?';
  db.query(query, [mail], async (err, results) => {
    if (err) {
      console.error('[LOGIN] Error en consulta login:', err);
      return res.status(500).send(err);
    }
    
    if (!results || results.length === 0) {
      console.log('[LOGIN] Usuario no encontrado para mail:', mail);
      return res.status(401).json({ success: false, msg: 'Usuario o contraseña incorrectos' });
    }

    console.log('[LOGIN] Usuario encontrado en BD');
    console.log('[LOGIN] Hash almacenado en BD (primeros 10 chars):', results[0].pass.substring(0, 10) + '...');

    try {
      // Comparar la contraseña con bcrypt
      const user = results[0];
      console.log('[LOGIN] Iniciando comparación de contraseñas con bcrypt...');
      const isPasswordValid = await bcrypt.compare(pass, user.pass);
      console.log('[LOGIN] Resultado de comparación bcrypt:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('[LOGIN] Contraseña incorrecta para mail:', mail);
        return res.status(401).json({ success: false, msg: 'Usuario o contraseña incorrectos' });
      }

      console.log('[LOGIN] Login exitoso para mail:', mail, 'rol:', user.rol);
      // Build a minimal, normalized response to avoid frontend ambiguity
      const userResponse = {
        mainId: user.mainId,
        mail: user.mail,
        rol: user.rol
      };
      const response = { success: true, rol: user.rol, user: userResponse };
      console.log('Enviando respuesta de login:', response);
      res.json(response);
      
    } catch (error) {
      console.error('[LOGIN] Error comparando contraseña:', error);
      console.error('[LOGIN] Stack trace:', error.stack);
      return res.status(500).json({ msg: 'Error en el servidor durante verificación' });
    }
  });
};

const registerUser = async (req, res) => {
  console.log('[REGISTRO] Iniciando proceso de registro');
  console.log('[REGISTRO] Request body:', req.body);
  const { mail, pass, rol, firstName, lastNameP, lastNameM, phoneNumber, birthday, address, curp, rfc, nss, balance } = req.body;

  // Validaciones básicas
  if (!mail || !pass || !rol || !firstName || !lastNameP || !phoneNumber || !curp) {
    console.warn('[REGISTRO] Campos faltantes en registro:', req.body);
    return res.status(400).json({ msg: 'Faltan campos obligatorios' });
  }

  console.log('[REGISTRO] Contraseña recibida (longitud):', pass.length);
  console.log('[REGISTRO] Contraseña original (primeros 3 chars):', pass.substring(0, 3) + '...');

  try {
    // Hashear la contraseña
    const saltRounds = 10;
    console.log('[REGISTRO] Iniciando hash con saltRounds:', saltRounds);
    const hashedPassword = await bcrypt.hash(pass, saltRounds);
    console.log('[REGISTRO] Contraseña hasheada exitosamente');
    console.log('[REGISTRO] Hash generado (primeros 10 chars):', hashedPassword.substring(0, 10) + '...');
    console.log('[REGISTRO] Hash completo length:', hashedPassword.length);

    // Verificar si el usuario ya existe
    const checkUserQuery = 'SELECT * FROM main WHERE mail = ?';
    db.query(checkUserQuery, [mail], (err, results) => {
      if (err) {
        console.error('Error verificando usuario existente:', err);
        return res.status(500).json({ msg: 'Error en el servidor' });
      }

      if (results.length > 0) {
        return res.status(400).json({ msg: 'El correo ya está registrado' });
      }

      // Insertar en tabla main con contraseña hasheada
      console.log('[REGISTRO] Insertando en tabla main...');
      const insertMainQuery = 'INSERT INTO main (mail, pass, rol) VALUES (?, ?, ?)';
      db.query(insertMainQuery, [mail, hashedPassword, rol], (err, mainResult) => {
        if (err) {
          console.error('[REGISTRO] Error insertando en main:', err);
          return res.status(500).json({ msg: 'Error registrando usuario' });
        }

        console.log('[REGISTRO] Usuario insertado en tabla main con ID:', mainResult.insertId);
        const mainId = mainResult.insertId;

        // Insertar en tabla específica según el rol
        if (rol === 'c') {
          // Cliente
          const insertCustomerQuery = `
            INSERT INTO customer (mainId, phoneNumber, firstName, lastNameP, lastNameM, birthday, address, curp, rfc, balance, cardNum, creditCardNum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const customerValues = [
            mainId, phoneNumber, firstName, lastNameP, lastNameM || '',
            birthday || null, address || '', curp, rfc || null,
            balance || 0, null, null
          ];

          db.query(insertCustomerQuery, customerValues, (err, customerResult) => {
            if (err) {
              console.error('Error insertando customer:', err);
              return res.status(500).json({ msg: 'Error registrando cliente' });
            }
            console.log('Cliente registrado exitosamente:', mainId);
            res.status(201).json({ msg: 'Cliente registrado exitosamente', mainId: mainId });
          });

        } else if (rol === 'e' || rol === 'm') {
          // Empleado o Manager
          const insertEmployeeQuery = `
            INSERT INTO employee (mainId, phoneNumber, firstName, lastNameP, lastNameM, birthday, address, curp, rfc, nss)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const employeeValues = [
            mainId, phoneNumber, firstName, lastNameP, lastNameM || '',
            birthday || null, address || '', curp, rfc || null, nss || null
          ];

          db.query(insertEmployeeQuery, employeeValues, (err, employeeResult) => {
            if (err) {
              console.error('Error insertando employee:', err);
              return res.status(500).json({ msg: 'Error registrando empleado' });
            }
            console.log('Empleado registrado exitosamente:', mainId);
            res.status(201).json({ msg: 'Empleado registrado exitosamente', mainId: mainId });
          });

        } else {
          return res.status(400).json({ msg: 'Rol no válido' });
        }
      });
    });
  } catch (error) {
    console.error('[REGISTRO] Error hasheando contraseña:', error);
    console.error('[REGISTRO] Stack trace:', error.stack);
    return res.status(500).json({ msg: 'Error en el servidor durante el hash' });
  }
};

module.exports = { getMain, getCustomers, getEmployees, getUsuario, login, registerUser };

