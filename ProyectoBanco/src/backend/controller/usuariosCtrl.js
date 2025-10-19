const db = require('../db');
const bcrypt = require('bcrypt');

// ==================== UTILIDADES ====================

const randomDigits = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');

function luhnCheckDigit(numberWithoutCheck) {
  const digits = numberWithoutCheck.split('').map(d => parseInt(d, 10)).reverse();
  const sum = digits.reduce((acc, d, idx) => {
    if (idx % 2 === 0) {
      const doubled = d * 2;
      return acc + (doubled > 9 ? doubled - 9 : doubled);
    }
    return acc + d;
  }, 0);
  const mod = sum % 10;
  return mod === 0 ? '0' : String(10 - mod);
}

function generateCardNumber(mainId) {
  const prefix = '4000';
  const idPart = String(mainId % 10000).padStart(4, '0');
  const randomPart = randomDigits(7);
  const base = `${prefix}${idPart}${randomPart}`;
  const check = luhnCheckDigit(base);
  return base + check;
}

function generateClabe() {
  return '646' + randomDigits(15);
}

function generateAccNum(mainId) {
  const idPart = String(mainId % 1000000).padStart(6, '0');
  return idPart + randomDigits(4);
}

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
  
  const sql = `INSERT INTO cAccount (mainId, cardNum, balance, clabe, accNum, accPhone, accType) VALUES (?, ?, 0, ?, ?, ?, ?)`;
  
  db.query(sql, [mainId, cardNum, clabe, accNum, accPhone, 'Debito'], (err, result) => {
    if (err && err.code === 'ER_DUP_ENTRY' && attempt < 5) {
      return createDefaultAccount(db, mainId, phoneNumber, cb, attempt + 1);
    }
    cb(err, { accountId: result?.insertId, mainId, cardNum, clabe, accNum, accPhone, accType: 'Debito' });
  });
}

// ==================== CONSULTAS ====================

const getMain = (req, res) => {
  db.query('SELECT * FROM main', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

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
    const rfc = row.customerRfc || row.employeeRfc || null;
    const { customerRfc, employeeRfc, ...rest } = row;
    res.json({ ...rest, rfc });
  });
};

const getAccountsByUser = (req, res) => {
  const { mainId } = req.params;
  if (!mainId) {
    return res.status(400).json({ msg: 'mainId requerido' });
  }
  
  const sql = `
    SELECT accountId, mainId, cardNum, balance, clabe, accNum, accPhone,
           COALESCE(accType, 'Debito') AS accType
    FROM cAccount
    WHERE mainId = ?
    ORDER BY accountId ASC
  `;
  
  db.query(sql, [mainId], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results || []);
  });
};

// ==================== AUTENTICACIÓN ====================

const login = async (req, res) => {
  const mail = req.body.mail;
  const pass = req.body.pass ?? req.body.password;

  if (!mail || !pass) {
    return res.status(400).json({ msg: 'Faltan campos mail o password' });
  }

  const query = 'SELECT * FROM main WHERE mail = ?';
  db.query(query, [mail], async (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    
    if (!results || results.length === 0) {
      return res.status(401).json({ success: false, msg: 'Usuario o contraseña incorrectos' });
    }

    try {
      const user = results[0];
      const isPasswordValid = await bcrypt.compare(pass, user.pass);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, msg: 'Usuario o contraseña incorrectos' });
      }

      const userResponse = {
        mainId: user.mainId,
        mail: user.mail,
        rol: user.rol
      };
      
      res.json({ success: true, rol: user.rol, user: userResponse });
      
    } catch (error) {
      return res.status(500).json({ msg: 'Error en el servidor durante verificación' });
    }
  });
};

const registerUser = async (req, res) => {
  let { mail, pass, rol, firstName, lastNameP, lastNameM, phoneNumber, birthday, address, curp, rfc, nss } = req.body;
  
  const trimOr = (v, fallback = '') => (typeof v === 'string' ? v.trim() : (v ?? fallback));
  mail = trimOr(mail);
  pass = trimOr(pass);
  rol = trimOr(rol);
  firstName = trimOr(firstName);
  lastNameP = trimOr(lastNameP);
  lastNameM = trimOr(lastNameM);
  phoneNumber = trimOr(phoneNumber);
  birthday = trimOr(birthday);
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
    return res.status(400).json({ msg: `Faltan campos obligatorios: ${missing.join(', ')}` });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pass, saltRounds);

    const checkUserQuery = 'SELECT * FROM main WHERE mail = ?';
    db.query(checkUserQuery, [mail], (err, results) => {
      if (err) {
        return res.status(500).json({ msg: 'Error en el servidor' });
      }

      if (results.length > 0) {
        return res.status(400).json({ msg: 'El correo ya está registrado' });
      }

      const insertMainQuery = 'INSERT INTO main (mail, pass, rol) VALUES (?, ?, ?)';
      db.query(insertMainQuery, [mail, hashedPassword, rol], (err, mainResult) => {
        if (err) {
          return res.status(500).json({ msg: 'Error registrando usuario' });
        }

        const mainId = mainResult.insertId;

        if (rol === 'c') {
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
              return res.status(500).json({ msg: 'Error registrando cliente' });
            }

            createDefaultAccount(db, mainId, phoneNumber, (accErr, accountInfo) => {
              if (accErr) {
                return res.status(201).json({
                  msg: 'Cliente registrado, pero falló la creación de la cuenta',
                  mainId: mainId
                });
              }
              res.status(201).json({
                msg: 'Cliente y cuenta creada exitosamente',
                mainId: mainId,
                account: accountInfo
              });
            });
          });

        } else if (rol === 'e' || rol === 'm') {
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
              return res.status(500).json({ msg: 'Error registrando empleado' });
            }
            res.status(201).json({ msg: 'Empleado registrado exitosamente', mainId: mainId });
          });

        } else {
          return res.status(400).json({ msg: 'Rol no válido' });
        }
      });
    });
  } catch (error) {
    return res.status(500).json({ msg: 'Error en el servidor durante el hash' });
  }
};

// ==================== TRANSFERENCIAS ====================

const transferFunds = (req, res) => {
  const { origin, destiny, amount, description } = req.body || {};
  
  if (!origin || !destiny || !amount) {
    return res.status(400).json({ 
      success: false,
      msg: 'Los campos origin, destiny y amount son requeridos' 
    });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ 
      success: false,
      msg: 'El monto debe ser un número mayor a 0' 
    });
  }

  const sql = `CALL sp_transfer_funds(?, ?, ?, ?)`;
  const params = [origin, destiny, numericAmount, description || null];
  
  db.query(sql, params, (err, results) => {
    if (err) {
      const msg = err?.sqlMessage || err?.message || 'Error en transferencia';
      return res.status(400).json({ 
        success: false,
        msg: msg 
      });
    }

    try {
      const firstResultSet = Array.isArray(results) && results.length > 0 ? results[0] : [];
      const row = firstResultSet[0] || {};
      
      return res.json({ 
        success: true, 
        tranId: row.tranId || null, 
        fee: row.fee || 0,
        msg: 'Transferencia realizada exitosamente'
      });
      
    } catch (e) {
      return res.status(500).json({ 
        success: false,
        msg: 'Error procesando la respuesta de la transferencia' 
      });
    }
  });
};

module.exports = { 
  getMain, 
  getCustomers, 
  getEmployees, 
  getUsuario, 
  login, 
  registerUser, 
  getAccountsByUser, 
  transferFunds 
};
