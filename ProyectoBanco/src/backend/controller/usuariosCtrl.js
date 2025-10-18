const db = require('../db');
const bcrypt = require('bcrypt');

// Utilidades para generar identificadores de cuenta
const randomDigits = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');

// Calcula dígito verificador Luhn para números de tarjeta
function luhnCheckDigit(numberWithoutCheck) {
  const digits = numberWithoutCheck.split('').map(d => parseInt(d, 10)).reverse();
  const sum = digits.reduce((acc, d, idx) => {
    if (idx % 2 === 0) {
      // posiciones pares desde la derecha (original impares) se duplican
      const doubled = d * 2;
      return acc + (doubled > 9 ? doubled - 9 : doubled);
    }
    return acc + d;
  }, 0);
  const mod = sum % 10;
  return mod === 0 ? '0' : String(10 - mod);
}

function generateCardNumber(mainId) {
  // Prefijo simple tipo VISA 4000 + parte del mainId + aleatorio, y calculamos Luhn para el último dígito
  const prefix = '4000';
  const idPart = String(mainId % 10000).padStart(4, '0');
  const randomPart = randomDigits(7); // 4 + 4 + 7 = 15, falta 1 para el dígito verificador
  const base = `${prefix}${idPart}${randomPart}`;
  const check = luhnCheckDigit(base);
  return base + check; // 16 dígitos
}

function generateClabe() {
  // CLABE simplificada: 646 (STP) + 15 dígitos aleatorios -> 18 dígitos en total
  return '646' + randomDigits(15);
}

function generateAccNum(mainId) {
  // 10 dígitos: parte del mainId + aleatorio
  const idPart = String(mainId % 1000000).padStart(6, '0');
  return idPart + randomDigits(4);
}

// Inserta una cuenta por defecto para el cliente, reintentando si hay colisiones de unicidad
function createDefaultAccount(db, mainId, phoneNumber, cb, attempt = 0) {
  const sanitizePhone = (p) => {
    if (!p) return null;
    const digits = String(p).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits || null;
  };
  const cardNum = generateCardNumber(mainId);
  const clabe = generateClabe();
  const accNum = generateAccNum(mainId);
  const accPhone = sanitizePhone(phoneNumber);
  const sql = `INSERT INTO cAccount (mainId, cardNum, balance, clabe, accNum, accPhone) VALUES (?, ?, 0, ?, ?, ?)`;
  db.query(sql, [mainId, cardNum, clabe, accNum, accPhone], (err, result) => {
    if (err && err.code === 'ER_DUP_ENTRY' && attempt < 5) {
      return createDefaultAccount(db, mainId, phoneNumber, cb, attempt + 1);
    }
    cb(err, { accountId: result?.insertId, mainId, cardNum, clabe, accNum, accPhone });
  });
}

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
           c.birthday, c.address, c.curp, c.rfc
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

// Obtener un usuario por id con campos normalizados
const getUsuario = (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      m.mainId, m.mail, m.rol,
      COALESCE(c.firstName, e.firstName) AS firstName,
      COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
      COALESCE(c.lastNameM, e.lastNameM) AS lastNameM,
      COALESCE(c.phoneNumber, e.phoneNumber) AS phoneNumber,
      COALESCE(c.birthday, e.birthday) AS birthday,
      COALESCE(c.address, e.address) AS address,
      COALESCE(c.curp, e.curp) AS curp,
      c.rfc AS customerRfc,
      e.rfc AS employeeRfc,
      e.nss AS nss
    FROM main m
    LEFT JOIN customer c ON m.mainId = c.mainId
    LEFT JOIN employee e ON m.mainId = e.mainId
    WHERE m.mainId = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).send(err);
    const row = results && results[0] ? results[0] : null;
    if (!row) return res.json({});
    // Unificar RFC según origen
    const rfc = row.customerRfc || row.employeeRfc || null;
    const { customerRfc, employeeRfc, ...rest } = row;
    res.json({ ...rest, rfc });
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
  let { mail, pass, rol, firstName, lastNameP, lastNameM, phoneNumber, birthday, address, curp, rfc, nss } = req.body;
  
  const trimOr = (v, fallback = '') => (typeof v === 'string' ? v.trim() : (v ?? fallback));
  mail = trimOr(mail);
  pass = trimOr(pass);
  rol = trimOr(rol);
  firstName = trimOr(firstName);
  lastNameP = trimOr(lastNameP);
  lastNameM = trimOr(lastNameM);
  phoneNumber = trimOr(phoneNumber);
  birthday = trimOr(birthday); // YYYY-MM-DD
  address = trimOr(address);
  curp = trimOr(curp);
  rfc = trimOr(rfc, null);
  nss = trimOr(nss, null);

  const missing = [];
  if (!mail) missing.push('mail');
  if (!pass) missing.push('pass');
  if (!rol) missing.push('rol');
  if (!firstName) missing.push('firstName');
  if (!lastNameP) missing.push('lastNameP');
  if (!phoneNumber) missing.push('phoneNumber');
  if (!birthday) missing.push('birthday');
  if (!address) missing.push('address');
  if (!curp) missing.push('curp');
  if (missing.length) {
    console.warn('[REGISTRO] Campos faltantes en registro:', missing);
    return res.status(400).json({ msg: `Faltan campos obligatorios: ${missing.join(', ')}` });
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

    const checkUserQuery = 'SELECT * FROM main WHERE mail = ?';
    db.query(checkUserQuery, [mail], (err, results) => {
      if (err) {
        console.error('Error verificando usuario existente:', err);
        return res.status(500).json({ msg: 'Error en el servidor' });
      }

      if (results.length > 0) {
        return res.status(400).json({ msg: 'El correo ya está registrado' });
      }

      console.log('[REGISTRO] Insertando en tabla main...');
      const insertMainQuery = 'INSERT INTO main (mail, pass, rol) VALUES (?, ?, ?)';
      db.query(insertMainQuery, [mail, hashedPassword, rol], (err, mainResult) => {
        if (err) {
          console.error('[REGISTRO] Error insertando en main:', err);
          return res.status(500).json({ msg: 'Error registrando usuario' });
        }

        console.log('[REGISTRO] Usuario insertado en tabla main con ID:', mainResult.insertId);
        const mainId = mainResult.insertId;

        if (rol === 'c') {
          // Cliente
          const insertCustomerQuery = `
            INSERT INTO customer (mainId, phoneNumber, firstName, lastNameP, lastNameM, birthday, address, curp, rfc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const customerValues = [
            mainId, phoneNumber, firstName, lastNameP, lastNameM || '',
            birthday || null, address || '', curp, rfc || null
          ];

          db.query(insertCustomerQuery, customerValues, (err, customerResult) => {
            if (err) {
              console.error('Error insertando customer:', err);
              return res.status(500).json({ msg: 'Error registrando cliente' });
            }
            console.log('Cliente registrado exitosamente:', mainId);

            // Crear cuenta por defecto para el cliente
            createDefaultAccount(db, mainId, phoneNumber, (accErr, accountInfo) => {
              if (accErr) {
                console.error('Error creando cuenta por defecto:', accErr);
                return res.status(201).json({
                  msg: 'Cliente registrado, pero falló la creación de la cuenta',
                  mainId: mainId
                });
              }
              console.log('Cuenta por defecto creada:', accountInfo);
              res.status(201).json({
                msg: 'Cliente y cuenta creada exitosamente',
                mainId: mainId,
                account: accountInfo
              });
            });
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

