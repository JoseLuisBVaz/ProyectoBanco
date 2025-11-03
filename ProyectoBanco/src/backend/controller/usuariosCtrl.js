const db = require('../db');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const emailService = require('../services/emailService');
const passwordResetService = require('../services/passwordResetService');
const pdfService = require('../services/pdfService');

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
    return res.status(400).json({ success: false, message: 'mainId requerido' });
  }
  
  const sql = `
    SELECT accountId, mainId, cardNum, balance, clabe, accNum, accPhone, accType
    FROM cAccount
    WHERE mainId = ?
    ORDER BY accountId ASC
  `;
  
  db.query(sql, [mainId], (err, results) => {
    if (err) {
      console.error('[ACCOUNTS] Error al obtener cuentas:', err);
      return res.status(500).json({ success: false, message: 'Error al obtener cuentas' });
    }
    res.json({ success: true, data: results || [] });
  });
};

// ==================== AUTENTICACI�N ====================

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
      return res.status(401).json({ success: false, msg: 'Usuario o contrase�a incorrectos' });
    }

    try {
      const user = results[0];
      const isPasswordValid = await bcrypt.compare(pass, user.pass);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, msg: 'Usuario o contrase�a incorrectos' });
      }

      const userResponse = {
        mainId: user.mainId,
        mail: user.mail,
        rol: user.rol
      };
      
      res.json({ success: true, rol: user.rol, user: userResponse });
      
    } catch (error) {
      return res.status(500).json({ msg: 'Error en el servidor durante verificaci�n' });
    }
  });
};

const registerUser = async (req, res) => {
  console.log('?? [REGISTER] === INICIO DE REGISTRO ===');
  console.log('?? [REGISTER] Correo:', req.body.mail);
  console.log('?? [REGISTER] Rol:', req.body.rol);
  
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
    
    console.log('?? [REGISTER] Contrase�a hasheada exitosamente');

    const checkUserQuery = 'SELECT * FROM main WHERE mail = ?';
    db.query(checkUserQuery, [mail], (err, results) => {
      if (err) {
        console.error('? [REGISTER] Error al verificar usuario existente:', err);
        return res.status(500).json({ msg: 'Error en el servidor' });
      }

      if (results.length > 0) {
        console.log('?? [REGISTER] El correo ya existe en la BD');
        return res.status(400).json({ msg: 'El correo ya est� registrado' });
      }
      
      console.log('?? [REGISTER] Correo disponible, insertando en tabla main...');

      const insertMainQuery = 'INSERT INTO main (mail, pass, rol) VALUES (?, ?, ?)';
      db.query(insertMainQuery, [mail, hashedPassword, rol], (err, mainResult) => {
        if (err) {
          console.error('? [REGISTER] Error al insertar en main:', err);
          return res.status(500).json({ msg: 'Error registrando usuario' });
        }

        const mainId = mainResult.insertId;
        console.log(`?? [REGISTER] Usuario insertado en main con ID: ${mainId}`);

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
              console.error('? [REGISTER] Error al insertar cliente:', err);
              return res.status(500).json({ msg: 'Error registrando cliente' });
            }

            console.log(`? [REGISTER] Cliente insertado correctamente, creando cuenta...`);

            createDefaultAccount(db, mainId, phoneNumber, (accErr, accountInfo) => {
              if (accErr) {
                console.error('? [REGISTER] Error al crear cuenta:', accErr);
                return res.status(201).json({
                  msg: 'Cliente registrado, pero fall� la creaci�n de la cuenta',
                  mainId: mainId
                });
              }
              
              console.log(`? [REGISTER] Cuenta creada correctamente`);
              
              // Enviar correos de forma as�ncrona en segundo plano (sin bloquear la respuesta)
              const fullName = `${firstName} ${lastNameP} ${lastNameM || ''}`.trim();
              
              console.log(`?? [REGISTER] Programando env�o de correos a: ${mail}`);
              console.log(`?? [REGISTER] Nombre completo: ${fullName}`);
              console.log(`?? [REGISTER] Datos de cuenta:`, accountInfo);
              
              // Ejecutar env�o de correos en segundo plano con setImmediate
              setImmediate(async () => {
                console.log(`?? [REGISTER] Iniciando env�o de correos a: ${mail}`);
                
                // Enviar correo de bienvenida
                try {
                  const welcomeResult = await emailService.sendWelcomeEmail(mail, {
                    customerName: fullName,
                    mail: mail
                  });
                  
                  if (welcomeResult.success) {
                    console.log(`? [REGISTER] Correo de bienvenida enviado exitosamente a: ${mail}`);
                  } else {
                    console.error(`? [REGISTER] Error al enviar correo de bienvenida: ${welcomeResult.error}`);
                  }
                } catch (emailErr) {
                  console.error('? [REGISTER] Excepci�n al enviar correo de bienvenida:', emailErr);
                }
                
                // Enviar correo de cuenta creada
                try {
                  const accountResult = await emailService.sendAccountCreatedEmail(mail, {
                    customerName: fullName,
                    accountType: accountInfo.accType,
                    cardNum: accountInfo.cardNum,
                    accNum: accountInfo.accNum,
                    clabe: accountInfo.clabe,
                    date: new Date().toLocaleString('es-MX')
                  });
                  
                  if (accountResult.success) {
                    console.log(`? [REGISTER] Correo de cuenta creada enviado exitosamente a: ${mail}`);
                  } else {
                    console.error(`? [REGISTER] Error al enviar correo de cuenta creada: ${accountResult.error}`);
                  }
                } catch (emailErr) {
                  console.error('? [REGISTER] Excepci�n al enviar correo de cuenta creada:', emailErr);
                }
              });
              
              // Responder inmediatamente sin esperar a los correos
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
            
            // Enviar correo de bienvenida a empleado en segundo plano
            const fullName = `${firstName} ${lastNameP} ${lastNameM || ''}`.trim();
            
            console.log(`?? [REGISTER] Programando env�o de correo de bienvenida a empleado: ${mail}`);
            console.log(`?? [REGISTER] Nombre completo: ${fullName}`);
            
            // Ejecutar env�o de correo en segundo plano con setImmediate
            setImmediate(async () => {
              console.log(`?? [REGISTER] Iniciando env�o de correo a empleado: ${mail}`);
              
              try {
                const welcomeResult = await emailService.sendWelcomeEmail(mail, {
                  customerName: fullName,
                  mail: mail
                });
                
                if (welcomeResult.success) {
                  console.log(`? [REGISTER] Correo de bienvenida enviado exitosamente a: ${mail}`);
                } else {
                  console.error(`? [REGISTER] Error al enviar correo de bienvenida: ${welcomeResult.error}`);
                }
              } catch (emailErr) {
                console.error('? [REGISTER] Excepci�n al enviar correo de bienvenida:', emailErr);
              }
            });
            
            // Responder inmediatamente sin esperar al correo
            res.status(201).json({ msg: 'Empleado registrado exitosamente', mainId: mainId });
          });

        } else {
          return res.status(400).json({ msg: 'Rol no v�lido' });
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
      msg: 'El monto debe ser un n�mero mayor a 0' 
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
      const tranId = row.tranId || null;
      const fee = row.fee || 0;
      
      // ==================== ENVIAR CORREOS DESPU�S DE LA TRANSFERENCIA ====================
      // Enviar correos de forma as�ncrona sin bloquear la respuesta
      sendTransferEmails(origin, destiny, numericAmount, description, tranId, fee)
        .catch(emailErr => {
          console.error('? [TRANSFER] Error al enviar correos:', emailErr);
          // No afectar la respuesta de la transferencia si falla el correo
        });
      
      return res.json({ 
        success: true, 
        tranId: tranId, 
        fee: fee,
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

// ==================== FUNCI�N AUXILIAR PARA ENVIAR CORREOS DE TRANSFERENCIA ====================
async function sendTransferEmails(origin, destiny, amount, description, tranId, fee) {
  try {
    const date = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Obtener informaci�n del origen y destino
    const infoQuery = `
      SELECT 
        ca.mainId, ca.accNum, ca.clabe, ca.balance,
        m.mail,
        COALESCE(c.firstName, e.firstName) AS firstName,
        COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
        COALESCE(c.lastNameM, e.lastNameM) AS lastNameM
      FROM cAccount ca
      INNER JOIN main m ON ca.mainId = m.mainId
      LEFT JOIN customer c ON m.mainId = c.mainId
      LEFT JOIN employee e ON m.mainId = e.mainId
      WHERE ca.accNum = ? OR ca.clabe = ?
    `;
    
    // Obtener datos de la cuenta origen
    const originData = await new Promise((resolve, reject) => {
      db.query(infoQuery, [origin, origin], (err, results) => {
        if (err) return reject(err);
        resolve(results && results[0] ? results[0] : null);
      });
    });
    
    // Obtener datos de la cuenta destino
    const destData = await new Promise((resolve, reject) => {
      db.query(infoQuery, [destiny, destiny], (err, results) => {
        if (err) return reject(err);
        resolve(results && results[0] ? results[0] : null);
      });
    });
    
    // Enviar correo al remitente (cuenta origen)
    if (originData && originData.mail) {
      const originName = `${originData.firstName} ${originData.lastNameP} ${originData.lastNameM || ''}`.trim();
      const destName = destData ? `${destData.firstName} ${destData.lastNameP} ${destData.lastNameM || ''}`.trim() : null;
      
      await emailService.sendTransferSentEmail(originData.mail, {
        customerName: originName,
        amount: amount,
        destinationAccount: destiny,
        destinationName: destName,
        description: description,
        tranId: tranId,
        date: date,
        fee: fee,
        newBalance: originData.balance
      });
      
      console.log(`? [TRANSFER] Correo de transferencia enviada a: ${originData.mail}`);
    }
    
    // Enviar correo al beneficiario (cuenta destino)
    if (destData && destData.mail) {
      const destName = `${destData.firstName} ${destData.lastNameP} ${destData.lastNameM || ''}`.trim();
      const originName = originData ? `${originData.firstName} ${originData.lastNameP} ${originData.lastNameM || ''}`.trim() : null;
      
      await emailService.sendTransferReceivedEmail(destData.mail, {
        customerName: destName,
        amount: amount,
        originAccount: origin,
        originName: originName,
        description: description,
        tranId: tranId,
        date: date,
        newBalance: destData.balance
      });
      
      console.log(`? [TRANSFER] Correo de transferencia recibida a: ${destData.mail}`);
    }
    
  } catch (error) {
    console.error('? [TRANSFER] Error al enviar correos:', error);
    throw error;
  }
}

// ==================== CREACI�N DE CUENTAS ====================

const createAccount = async (req, res) => {
  const { customerId, createdBy, accType, accPhone, password, curp } = req.body || {};
  
  // Validar campos requeridos
  if (!customerId || !createdBy || !accType || !accPhone || !password || !curp) {
    return res.status(400).json({ 
      success: false,
      msg: 'Todos los campos son requeridos: customerId, createdBy, accType, accPhone, password, curp' 
    });
  }

  // Validar que los IDs sean n�meros
  const numericCustomerId = parseInt(customerId);
  const numericCreatedBy = parseInt(createdBy);
  
  if (isNaN(numericCustomerId) || isNaN(numericCreatedBy)) {
    return res.status(400).json({ 
      success: false,
      msg: 'customerId y createdBy deben ser n�meros v�lidos' 
    });
  }

  // Validar formato de tel�fono (10 d�gitos)
  const sanitizedPhone = String(accPhone).replace(/\D/g, '');
  if (sanitizedPhone.length !== 10) {
    return res.status(400).json({ 
      success: false,
      msg: 'El tel�fono debe tener exactamente 10 d�gitos' 
    });
  }

  // Validar tipo de cuenta
  if (accType !== 'Debito' && accType !== 'Credito') {
    return res.status(400).json({ 
      success: false,
      msg: 'El tipo de cuenta debe ser Debito o Credito' 
    });
  }

  // Validar CURP
  const sanitizedCurp = String(curp).trim().toUpperCase();
  if (sanitizedCurp.length !== 18) {
    return res.status(400).json({ 
      success: false,
      msg: 'El CURP debe tener exactamente 18 caracteres' 
    });
  }

  try {
    // 1?? Verificar que el usuario creador (manager/empleado) tenga permisos
    const checkCreatorSql = 'SELECT mainId, rol FROM main WHERE mainId = ?';
    
    db.query(checkCreatorSql, [numericCreatedBy], (err, creatorResults) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          msg: 'Error al verificar el usuario creador' 
        });
      }

      if (creatorResults.length === 0) {
        return res.status(404).json({ 
          success: false,
          msg: 'Usuario creador no encontrado' 
        });
      }

      const creator = creatorResults[0];

      // Validar que el creador sea manager ('m') o empleado ('e')
      if (creator.rol !== 'm' && creator.rol !== 'e') {
        return res.status(403).json({ 
          success: false,
          msg: 'Solo managers y empleados pueden crear cuentas para clientes' 
        });
      }

      // 2?? Verificar que el cliente exista y obtener sus datos
      const checkCustomerSql = `
        SELECT m.mainId, m.rol, m.pass, c.curp 
        FROM main m
        LEFT JOIN customer c ON m.mainId = c.mainId
        WHERE m.mainId = ?
      `;
      
      db.query(checkCustomerSql, [numericCustomerId], async (err, customerResults) => {
        if (err) {
          return res.status(500).json({ 
            success: false,
            msg: 'Error al verificar el cliente' 
          });
        }

        if (customerResults.length === 0) {
          return res.status(404).json({ 
            success: false,
            msg: 'Cliente no encontrado' 
          });
        }

        const customer = customerResults[0];

        // Validar que sea un cliente
        if (customer.rol !== 'c') {
          return res.status(403).json({ 
            success: false,
            msg: 'El usuario seleccionado no es un cliente' 
          });
        }

        // 3?? Verificar contrase�a del cliente
        const isPasswordValid = await bcrypt.compare(password, customer.pass);
        if (!isPasswordValid) {
          return res.status(401).json({ 
            success: false,
            msg: 'Contrase�a del cliente incorrecta' 
          });
        }

        // 4?? Verificar CURP del cliente
        if (customer.curp !== sanitizedCurp) {
          return res.status(401).json({ 
            success: false,
            msg: 'El CURP no coincide con el registrado del cliente' 
          });
        }

        // 5?? Generar n�meros �nicos para la cuenta
        const cardNum = generateCardNumber(numericCustomerId);
        const clabe = generateClabe();
        const accNum = generateAccNum(numericCustomerId);

        // 6?? Insertar la nueva cuenta
        const insertSql = `
          INSERT INTO cAccount (mainId, cardNum, balance, clabe, accNum, accPhone, accType) 
          VALUES (?, ?, 0, ?, ?, ?, ?)
        `;
        
        db.query(insertSql, [numericCustomerId, cardNum, clabe, accNum, sanitizedPhone, accType], (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ 
                success: false,
                msg: 'Error: n�mero de cuenta duplicado. Intenta nuevamente' 
              });
            }
            return res.status(500).json({ 
              success: false,
              msg: 'Error al crear la cuenta' 
            });
          }

          // 7?? Respuesta exitosa
          return res.json({ 
            success: true,
            accountId: result.insertId,
            cardNum,
            clabe,
            accNum,
            msg: 'Cuenta creada exitosamente'
          });
        });
      });
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      msg: 'Error en el servidor al crear la cuenta' 
    });
  }
};

// ==================== GENERACI�N DE COMPROBANTES ====================

const generateReceipt = (req, res) => {
  const { tranId } = req.params;

  console.log('?? [RECEIPT] Solicitud de comprobante para tranId:', tranId);

  if (!tranId) {
    console.log('? [RECEIPT] tranId no proporcionado');
    return res.status(400).json({ 
      success: false,
      msg: 'Se requiere el ID de la transferencia' 
    });
  }

  // Primero: obtener datos b�sicos de la transferencia
  const sql = `
    SELECT 
      tranId,
      origin,
      destiny,
      ammount as amount,
      fee,
      description,
      doDate
    FROM transfer
    WHERE tranId = ?
  `;

  console.log('?? [RECEIPT] Ejecutando query SQL para tranId:', tranId);

  db.query(sql, [tranId], (err, results) => {
    if (err) {
      console.error('? [RECEIPT] Error al consultar transferencia:', err);
      return res.status(500).json({ 
        success: false,
        msg: 'Error al obtener informaci�n de la transferencia',
        error: err.message
      });
    }

    console.log('? [RECEIPT] Query ejecutado, resultados:', results.length);

    if (results.length === 0) {
      console.log('?? [RECEIPT] Transferencia no encontrada para tranId:', tranId);
      return res.status(404).json({ 
        success: false,
        msg: 'Transferencia no encontrada' 
      });
    }

    const transfer = results[0];
    console.log('?? [RECEIPT] Datos obtenidos:', transfer);

    // Segundo: obtener nombres de los due�os de las cuentas
    const sqlNames = `
      SELECT 
        ca.accNum,
        ca.clabe,
        m.name,
        m.fLastName,
        m.mLastName
      FROM cAccount ca
      INNER JOIN main m ON ca.mainId = m.mainId
      WHERE ca.accNum IN (?, ?) OR ca.clabe IN (?, ?)
    `;

    db.query(sqlNames, [transfer.origin, transfer.destiny, transfer.origin, transfer.destiny], (errNames, namesResults) => {
      if (errNames) {
        console.error('?? [RECEIPT] Error al obtener nombres (continuando sin nombres):', errNames);
      }

      // Mapear nombres a las cuentas
      let originName = null, originFLastName = null, originMLastName = null;
      let destName = null, destFLastName = null, destMLastName = null;

      if (namesResults && namesResults.length > 0) {
        namesResults.forEach(row => {
          if (row.accNum === transfer.origin || row.clabe === transfer.origin) {
            originName = row.name;
            originFLastName = row.fLastName;
            originMLastName = row.mLastName;
          }
          if (row.accNum === transfer.destiny || row.clabe === transfer.destiny) {
            destName = row.name;
            destFLastName = row.fLastName;
            destMLastName = row.mLastName;
          }
        });
      }

      // Agregar nombres al objeto transfer
      transfer.origin_name = originName;
      transfer.origin_fLastName = originFLastName;
      transfer.origin_mLastName = originMLastName;
      transfer.dest_name = destName;
      transfer.dest_fLastName = destFLastName;
      transfer.dest_mLastName = destMLastName;

      console.log('?? [RECEIPT] Nombres obtenidos - Origen:', originName, 'Destino:', destName);

      try {
        // Crear documento PDF
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          bufferPages: true
        });

        console.log('?? [RECEIPT] Generando PDF...');

        // Configurar headers para enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=comprobante-${tranId}.pdf`);

        // Pipe del PDF a la respuesta
        doc.pipe(res);

      // ========== DISE�O DEL COMPROBANTE (estilo BBVA) ==========

      // 1. HEADER - Logo y nombre del banco
      doc.fontSize(36)
         .fillColor('#072146')
         .text('BANCO JETY', 50, 50);

      // 2. T�TULO
      doc.fontSize(20)
         .fillColor('#000000')
         .text('Comprobante de la operaci�n', 50, 105);

      // L�nea separadora
      doc.moveTo(50, 145)
         .lineTo(545, 145)
         .strokeColor('#072146')
         .lineWidth(2)
         .stroke();

      let yPos = 165;

      // 3. TIPO DE OPERACI�N
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Tipo de operaci�n', 50, yPos);
      
      yPos += 18;
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Transferencia bancaria', 50, yPos);

      yPos += 35;

      // 4. FECHA (usar timestamp actual para mostrar fecha/hora real)
      const fechaActual = new Date(); // Fecha y hora actual del servidor
      const fechaDoDate = transfer.doDate ? new Date(transfer.doDate) : fechaActual;
      const fechaFormato = fechaDoDate.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

      doc.fontSize(12)
         .fillColor('#666666')
         .text(fechaFormato, 50, yPos);

      yPos += 35;

      // 5. IMPORTE (GRANDE Y DESTACADO)
      doc.fontSize(13)
         .fillColor('#666666')
         .text('Importe', 50, yPos);

      yPos += 22;
      const montoFormato = `$ -${Number(transfer.amount || 0).toFixed(2)}`;
      doc.fontSize(42)
         .fillColor('#072146')
         .text(montoFormato, 50, yPos);

      yPos += 65;

      // 6. NOMBRE DEL ORDENANTE (due�o de cuenta origen)
      if (transfer.origin_name) {
        doc.fontSize(11)
           .fillColor('#666666')
           .text('Nombre del ordenante', 50, yPos);

        yPos += 18;
        const nombreOrdenante = `${transfer.origin_name} ${transfer.origin_fLastName} ${transfer.origin_mLastName}`.toUpperCase();
        doc.fontSize(14)
           .fillColor('#000000')
           .text(nombreOrdenante, 50, yPos);

        yPos += 35;
      }

      // 7. CUENTA ORIGEN
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Cuenta origen', 50, yPos);

      yPos += 18;
      doc.fontSize(14)
         .fillColor('#000000')
         .text(transfer.origin || 'N/A', 50, yPos);

      yPos += 35;

      // 8. NOMBRE DEL BENEFICIARIO (due�o de cuenta destino)
      if (transfer.dest_name) {
        doc.fontSize(11)
           .fillColor('#666666')
           .text('Nombre del beneficiario', 50, yPos);

        yPos += 18;
        const nombreBeneficiario = `${transfer.dest_name} ${transfer.dest_fLastName} ${transfer.dest_mLastName}`;
        doc.fontSize(14)
           .fillColor('#000000')
           .text(nombreBeneficiario, 50, yPos);

        yPos += 35;
      }

      // 9. CUENTA DESTINO
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Cuenta destino', 50, yPos);

      yPos += 18;
      doc.fontSize(14)
         .fillColor('#000000')
         .text(transfer.destiny || 'N/A', 50, yPos);

      yPos += 35;

      // 10. BANCO DESTINO
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Banco destino', 50, yPos);

      yPos += 18;
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Banco Jety', 50, yPos);

      yPos += 35;

      // 9. CONCEPTO
      if (transfer.description) {
        doc.fontSize(11)
           .fillColor('#666666')
           .text('Concepto', 50, yPos);

        yPos += 18;
        doc.fontSize(13)
           .fillColor('#000000')
           .text(transfer.description, 50, yPos, { width: 495 });

        yPos += 35;
      }

      // 12. FECHA DE OPERACI�N (hora actual real del servidor)
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Fecha de operaci�n', 50, yPos);

      yPos += 18;
      const fechaHora = fechaActual.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      doc.fontSize(13)
         .fillColor('#000000')
         .text(fechaHora + ' h', 50, yPos);

      yPos += 35;

      // 11. FOLIO DE OPERACI�N
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Folio de operaci�n', 50, yPos);

      yPos += 18;
      const folio = transfer.tranId.toString().padStart(10, '0');
      doc.fontSize(14)
         .fillColor('#000000')
         .text(folio, 50, yPos);

      yPos += 35;

      // 13. COMISI�N (si existe)
      if (transfer.fee && transfer.fee > 0) {
        doc.fontSize(11)
           .fillColor('#666666')
           .text('Comisi�n', 50, yPos);

        yPos += 18;
        doc.fontSize(13)
           .fillColor('#000000')
           .text(`$ ${Number(transfer.fee).toFixed(2)}`, 50, yPos);
      }

      // 14. FOOTER
      doc.fontSize(9)
         .fillColor('#999999')
         .text('Este comprobante es v�lido sin firma aut�grafa', 50, 750, {
           width: 495,
           align: 'center'
         });

      doc.fontSize(8)
         .text('Banco Jety - Sistema de Banca en L�nea', 50, 770, {
           width: 495,
           align: 'center'
         });

      // Finalizar el PDF
      doc.end();

        console.log(`? [RECEIPT] Comprobante PDF generado exitosamente para transferencia #${tranId}`);

      } catch (pdfError) {
        console.error('? [RECEIPT] Error al generar PDF:', pdfError);
        // Si ya se envi� el header, no podemos enviar JSON
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            msg: 'Error al generar el PDF',
            error: pdfError.message
          });
        } else {
          // Si ya se enviaron headers, terminar el stream
          res.end();
        }
      }
    });
  });
};

// ==================== RECUPERACI�N DE CONTRASE�A ====================

/**
 * Solicita recuperaci�n de contrase�a - Genera token y env�a correo
 */
const requestPasswordReset = async (req, res) => {
  const { mail } = req.body;
  
  if (!mail) {
    return res.status(400).json({ 
      success: false,
      msg: 'El correo electr�nico es requerido' 
    });
  }
  
  try {
    // Verificar que el usuario existe
    const query = 'SELECT mainId, mail FROM main WHERE mail = ?';
    
    db.query(query, [mail], async (err, results) => {
      if (err) {
        console.error('? [PASSWORD-RESET] Error al buscar usuario:', err);
        return res.status(500).json({ 
          success: false,
          msg: 'Error en el servidor' 
        });
      }
      
      // Por seguridad, no revelar si el correo existe o no
      if (!results || results.length === 0) {
        console.log(`?? [PASSWORD-RESET] Correo no encontrado: ${mail}`);
        // Responder como si fuera exitoso para no dar pistas
        return res.json({ 
          success: true,
          msg: 'Si el correo existe, recibir�s un enlace de recuperaci�n' 
        });
      }
      
      const user = results[0];
      
      // Obtener nombre del usuario
      const nameQuery = `
        SELECT 
          COALESCE(c.firstName, e.firstName) AS firstName,
          COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
          COALESCE(c.lastNameM, e.lastNameM) AS lastNameM
        FROM main m
        LEFT JOIN customer c ON m.mainId = c.mainId
        LEFT JOIN employee e ON m.mainId = e.mainId
        WHERE m.mainId = ?
      `;
      
      db.query(nameQuery, [user.mainId], (nameErr, nameResults) => {
        let customerName = 'Usuario';
        
        if (nameResults && nameResults[0]) {
          const name = nameResults[0];
          customerName = `${name.firstName} ${name.lastNameP} ${name.lastNameM || ''}`.trim();
        }
        
        // Generar token
        const token = passwordResetService.generateResetToken(mail);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        // Crear enlace de recuperaci�n
        const resetLink = `http://localhost:4200/reset-password?token=${token}&mail=${encodeURIComponent(mail)}`;
        
        const expirationTime = expiresAt.toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        // Enviar correo
        emailService.sendPasswordResetEmail(mail, {
          customerName: customerName,
          resetToken: token,
          resetLink: resetLink,
          expirationTime: expirationTime
        }).then(emailResult => {
          if (emailResult.success) {
            console.log(`? [PASSWORD-RESET] Correo de recuperaci�n enviado a: ${mail}`);
            res.json({ 
              success: true,
              msg: 'Correo de recuperaci�n enviado exitosamente' 
            });
          } else {
            console.error('? [PASSWORD-RESET] Error al enviar correo:', emailResult.error);
            res.status(500).json({ 
              success: false,
              msg: 'Error al enviar el correo de recuperaci�n' 
            });
          }
        }).catch(error => {
          console.error('? [PASSWORD-RESET] Error al enviar correo:', error);
          res.status(500).json({ 
            success: false,
            msg: 'Error al enviar el correo de recuperaci�n' 
          });
        });
      });
    });
    
  } catch (error) {
    console.error('? [PASSWORD-RESET] Error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Error en el servidor' 
    });
  }
};

/**
 * Restablece la contrase�a con el token
 */
const resetPassword = (req, res) => {
  const { mail, token, newPassword } = req.body;
  
  if (!mail || !token || !newPassword) {
    return res.status(400).json({ 
      success: false,
      msg: 'Todos los campos son requeridos: mail, token, newPassword' 
    });
  }
  
  try {
    // Verificar token
    const verification = passwordResetService.verifyResetToken(token, mail);
    
    if (!verification.valid) {
      console.log(`?? [PASSWORD-RESET] Token inv�lido: ${verification.reason}`);
      return res.status(400).json({ 
        success: false,
        msg: verification.reason 
      });
    }
    
    // Verificar que el usuario existe
    const query = 'SELECT mainId, mail FROM main WHERE mail = ?';
    
    db.query(query, [mail], async (err, results) => {
      if (err) {
        console.error('? [PASSWORD-RESET] Error al buscar usuario:', err);
        return res.status(500).json({ 
          success: false,
          msg: 'Error en el servidor' 
        });
      }
      
      if (!results || results.length === 0) {
        return res.status(404).json({ 
          success: false,
          msg: 'Usuario no encontrado' 
        });
      }
      
      const user = results[0];
      
      // Hash de la nueva contrase�a
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Actualizar contrase�a
      const updateQuery = 'UPDATE main SET pass = ? WHERE mail = ?';
      
      db.query(updateQuery, [hashedPassword, mail], async (updateErr, updateResult) => {
        if (updateErr) {
          console.error('? [PASSWORD-RESET] Error al actualizar contrase�a:', updateErr);
          return res.status(500).json({ 
            success: false,
            msg: 'Error al actualizar la contrase�a' 
          });
        }
        
        // Marcar token como usado
        passwordResetService.markTokenAsUsed(token);
        
        // Obtener nombre del usuario
        const nameQuery = `
          SELECT 
            COALESCE(c.firstName, e.firstName) AS firstName,
            COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
            COALESCE(c.lastNameM, e.lastNameM) AS lastNameM
          FROM main m
          LEFT JOIN customer c ON m.mainId = c.mainId
          LEFT JOIN employee e ON m.mainId = e.mainId
          WHERE m.mainId = ?
        `;
        
        db.query(nameQuery, [user.mainId], async (nameErr, nameResults) => {
          let customerName = 'Usuario';
          
          if (nameResults && nameResults[0]) {
            const name = nameResults[0];
            customerName = `${name.firstName} ${name.lastNameP} ${name.lastNameM || ''}`.trim();
          }
          
          // Enviar correo de confirmaci�n
          emailService.sendPasswordChangedEmail(mail, {
            customerName: customerName,
            date: new Date().toLocaleString('es-MX'),
            ipAddress: req.ip || 'No disponible'
          }).then(() => {
            console.log(`? [PASSWORD-RESET] Correo de confirmaci�n enviado a: ${mail}`);
          }).catch(emailErr => {
            console.error('? [PASSWORD-RESET] Error al enviar correo de confirmaci�n:', emailErr);
          });
          
          console.log(`? [PASSWORD-RESET] Contrase�a actualizada para: ${mail}`);
          res.json({ 
            success: true,
            msg: 'Contrase�a actualizada exitosamente' 
          });
        });
      });
    });
    
  } catch (error) {
    console.error('? [PASSWORD-RESET] Error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Error en el servidor' 
    });
  }
};

// ==================== DEP�SITOS ====================

const depositFunds = (req, res) => {
  console.log('?? [DEPOSIT] Solicitud de dep�sito recibida');
  console.log('?? [DEPOSIT] Body:', JSON.stringify(req.body, null, 2));
  
  const { mainId, amount, description } = req.body || {};
  
  if (!mainId || !amount) {
    console.log('? [DEPOSIT] Campos faltantes:', { mainId, amount });
    return res.status(400).json({ 
      success: false,
      msg: 'Los campos mainId y amount son requeridos' 
    });
  }

  const numericMainId = parseInt(mainId);
  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericMainId) || numericMainId <= 0) {
    console.log('? [DEPOSIT] mainId inv�lido:', mainId);
    return res.status(400).json({ 
      success: false,
      msg: 'El mainId debe ser un n�mero v�lido' 
    });
  }
  
  if (isNaN(numericAmount) || numericAmount <= 0) {
    console.log('? [DEPOSIT] Monto inv�lido:', amount);
    return res.status(400).json({ 
      success: false,
      msg: 'El monto debe ser un n�mero mayor a 0' 
    });
  }

  const sql = `CALL sp_deposit_funds(?, ?, ?)`;
  const params = [numericMainId, numericAmount, description || 'Dep�sito en efectivo'];
  
  console.log('?? [DEPOSIT] Ejecutando SP con params:', params);
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('? [DEPOSIT] Error en SP:', err);
      console.error('? [DEPOSIT] SQL State:', err.sqlState);
      console.error('? [DEPOSIT] SQL Message:', err.sqlMessage);
      const msg = err?.sqlMessage || err?.message || 'Error en dep�sito';
      return res.status(400).json({ 
        success: false,
        msg: msg 
      });
    }

    console.log('? [DEPOSIT] SP ejecutado, results:', results);

    try {
      const firstResultSet = Array.isArray(results) && results.length > 0 ? results[0] : [];
      const row = firstResultSet[0] || {};
      const depId = row.depId || null;
      const newBalance = row.newBalance || 0;
      const accountNumber = row.accountNumber || '';
      
      console.log('? [DEPOSIT] Datos extra�dos:', { depId, newBalance, accountNumber });
      
      // ==================== ENVIAR CORREO DESPU�S DEL DEP�SITO ====================
      // Enviar correo de forma as�ncrona sin bloquear la respuesta
      sendDepositEmail(accountNumber, numericAmount, description, depId, newBalance)
        .catch(emailErr => {
          console.error('? [DEPOSIT] Error al enviar correo:', emailErr);
          // No afectar la respuesta del dep�sito si falla el correo
        });
      
      return res.json({ 
        success: true, 
        depId: depId, 
        newBalance: newBalance,
        msg: 'Dep�sito realizado exitosamente'
      });
      
    } catch (e) {
      return res.status(500).json({ 
        success: false,
        msg: 'Error procesando la respuesta del dep�sito' 
      });
    }
  });
};

// ==================== FUNCI�N AUXILIAR PARA ENVIAR CORREO DE DEP�SITO ====================
async function sendDepositEmail(destination, amount, description, depId, newBalance) {
  try {
    const date = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Obtener informaci�n de la cuenta destino
    const infoQuery = `
      SELECT 
        ca.mainId, ca.accNum, ca.clabe,
        m.mail,
        COALESCE(c.firstName, e.firstName) AS firstName,
        COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
        COALESCE(c.lastNameM, e.lastNameM) AS lastNameM
      FROM cAccount ca
      INNER JOIN main m ON ca.mainId = m.mainId
      LEFT JOIN customer c ON m.mainId = c.mainId
      LEFT JOIN employee e ON m.mainId = e.mainId
      WHERE ca.accNum = ? OR ca.clabe = ?
    `;
    
    // Obtener datos de la cuenta destino
    const destData = await new Promise((resolve, reject) => {
      db.query(infoQuery, [destination, destination], (err, results) => {
        if (err) return reject(err);
        resolve(results && results[0] ? results[0] : null);
      });
    });
    
    // Enviar correo al beneficiario
    if (destData && destData.mail) {
      const destName = `${destData.firstName} ${destData.lastNameP} ${destData.lastNameM || ''}`.trim();
      
      await emailService.sendDepositReceivedEmail(destData.mail, {
        customerName: destName,
        amount: amount,
        accountNumber: destination,
        description: description,
        depId: depId,
        date: date,
        newBalance: newBalance
      });
      
      console.log(`? [DEPOSIT] Correo de dep�sito enviado a: ${destData.mail}`);
    }
    
  } catch (error) {
    console.error('? [DEPOSIT] Error al enviar correo:', error);
    throw error;
  }
}

// ==================== GENERAR PDF DE TRANSFERENCIA ====================
const generateTransferPDF = async (req, res) => {
  try {
    const { tranId } = req.params;
    
    console.log(`?? [PDF] Solicitud de PDF para tranId: ${tranId}`);
    
    if (!tranId) {
      return res.status(400).json({ success: false, msg: 'tranId requerido' });
    }
    
    // Obtener datos de la transferencia
    const query = `
      SELECT 
        tranId, origin, destiny, ammount as amount, fee, description, doDate
      FROM transfer
      WHERE tranId = ?
    `;
    
    db.query(query, [tranId], async (err, results) => {
      if (err) {
        console.error('? [PDF] Error en query:', err);
        return res.status(500).json({ success: false, msg: 'Error al obtener datos' });
      }
      
      if (!results || results.length === 0) {
        console.error('? [PDF] Transferencia no encontrada');
        return res.status(404).json({ success: false, msg: 'Transferencia no encontrada' });
      }
      
      const transfer = results[0];
      console.log('?? [PDF] Datos de transferencia:', transfer);
      
      // Formatear fecha
      const date = new Date(transfer.doDate).toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Preparar datos para el PDF
      const pdfData = {
        tranId: transfer.tranId,
        date: date,
        amount: transfer.amount,
        fee: transfer.fee,
        originAccount: transfer.origin,
        destinationAccount: transfer.destiny,
        description: transfer.description || 'Transferencia'
      };
      
      try {
        // Generar PDF
        const pdfService = require('../services/pdfService');
        const pdfBuffer = await pdfService.generateTransferPDF(pdfData);
        
        console.log('? [PDF] PDF generado exitosamente');
        
        // Enviar PDF como descarga
        const filename = `Comprobante_Transferencia_${String(tranId).padStart(10, '0')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
        
      } catch (pdfError) {
        console.error('? [PDF] Error al generar PDF:', pdfError);
        return res.status(500).json({ success: false, msg: 'Error al generar PDF' });
      }
    });
    
  } catch (error) {
    console.error('? [PDF] Error general:', error);
    return res.status(500).json({ success: false, msg: 'Error interno del servidor' });
  }
};

// ==================== GENERAR PDF DE DEP�SITO ====================
const generateDepositPDF = async (req, res) => {
  try {
    const { depId } = req.params;
    
    console.log(`?? [PDF] Solicitud de PDF para depId: ${depId}`);
    
    if (!depId) {
      return res.status(400).json({ success: false, msg: 'depId requerido' });
    }
    
    // Obtener datos del dep�sito
    const query = `
      SELECT 
        depId, mainId, accNum, amount, description, depositDate
      FROM deposito
      WHERE depId = ?
    `;
    
    db.query(query, [depId], async (err, results) => {
      if (err) {
        console.error('? [PDF] Error en query:', err);
        return res.status(500).json({ success: false, msg: 'Error al obtener datos' });
      }
      
      if (!results || results.length === 0) {
        console.error('? [PDF] Dep�sito no encontrado');
        return res.status(404).json({ success: false, msg: 'Dep�sito no encontrado' });
      }
      
      const deposit = results[0];
      console.log('?? [PDF] Datos de dep�sito:', deposit);
      
      // Obtener saldo actual
      const accountQuery = `SELECT balance FROM cAccount WHERE accNum = ?`;
      db.query(accountQuery, [deposit.accNum], async (accErr, accResults) => {
        if (accErr) {
          console.error('? [PDF] Error al obtener saldo:', accErr);
        }
        
        const balance = accResults && accResults[0] ? accResults[0].balance : 0;
        
        // Formatear fecha
        const date = new Date(deposit.depositDate).toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Preparar datos para el PDF
        const pdfData = {
          depId: deposit.depId,
          date: date,
          amount: deposit.amount,
          accountNumber: deposit.accNum,
          description: deposit.description || 'Dep�sito en efectivo',
          newBalance: balance
        };
        
        try {
          // Generar PDF
          const pdfService = require('../services/pdfService');
          const pdfBuffer = await pdfService.generateDepositPDF(pdfData);
          
          console.log('? [PDF] PDF generado exitosamente');
          
          // Enviar PDF como descarga
          const filename = `Comprobante_Deposito_${String(depId).padStart(10, '0')}.pdf`;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(pdfBuffer);
          
        } catch (pdfError) {
          console.error('? [PDF] Error al generar PDF:', pdfError);
          return res.status(500).json({ success: false, msg: 'Error al generar PDF' });
        }
      });
    });
    
  } catch (error) {
    console.error('? [PDF] Error general:', error);
    return res.status(500).json({ success: false, msg: 'Error interno del servidor' });
  }
};

// ==================== RETIROS SIN TARJETA ====================

/**
 * Crear un retiro sin tarjeta
 * Genera un c�digo �nico y registra el retiro en la base de datos
 */
const crearRetiroSinTarjeta = async (req, res) => {
  const { mainId, accNum, amount, password, description } = req.body;

  console.log('[RETIRO] Iniciando retiro sin tarjeta', { mainId, accNum, amount });

  // Validaciones
  if (!mainId || !accNum || !amount || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Faltan datos requeridos: mainId, accNum, amount, password' 
    });
  }

  if (amount < 100) {
    return res.status(400).json({ 
      success: false, 
      message: 'El monto m�nimo de retiro es $100.00' 
    });
  }

  if (amount > 10000) {
    return res.status(400).json({ 
      success: false, 
      message: 'El monto m�ximo de retiro es $10,000.00' 
    });
  }

  try {
    // 1. Verificar la contrase�a del usuario
    const verifyPasswordSql = 'SELECT pass FROM main WHERE mainId = ?';
    
    db.query(verifyPasswordSql, [mainId], async (passErr, users) => {
      if (passErr) {
        console.error('[RETIRO] Error al verificar contrase�a:', passErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar la contrase�a' 
        });
      }

      if (!users || users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      const storedPassword = users[0].pass;
      
      try {
        // Comparar contrase�a con bcrypt
        const isPasswordValid = await bcrypt.compare(password, storedPassword);
        
        if (!isPasswordValid) {
          return res.status(401).json({ 
            success: false, 
            message: 'Contrase�a incorrecta' 
          });
        }

        // 2. Obtener informaci�n del usuario y cuenta
        const getUserInfoSql = `
      SELECT m.mail, c.firstName, c.lastNameP, c.lastNameM
      FROM main m
      INNER JOIN customer c ON m.mainId = c.mainId
      WHERE m.mainId = ?
    `;
    
    db.query(getUserInfoSql, [mainId], (userErr, users) => {
      if (userErr || !users || users.length === 0) {
        console.error('[RETIRO] Error al obtener info del usuario:', userErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al obtener informaci�n del usuario' 
        });
      }

      const userInfo = users[0];
      const customerName = `${userInfo.firstName} ${userInfo.lastNameP} ${userInfo.lastNameM}`;
      const userEmail = userInfo.mail;

      // 2. Verificar que la cuenta existe y tiene saldo suficiente
      const checkAccountSql = 'SELECT accountId, balance FROM cAccount WHERE accNum = ? AND mainId = ?';
      
      db.query(checkAccountSql, [accNum, mainId], (err, accounts) => {
        if (err) {
          console.error('[RETIRO] Error al verificar cuenta:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error al verificar la cuenta' 
          });
        }

        if (!accounts || accounts.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Cuenta no encontrada' 
          });
        }

        const account = accounts[0];

        if (account.balance < amount) {
          return res.status(400).json({ 
            success: false, 
            message: 'Saldo insuficiente' 
          });
        }

        // 3. Generar c�digo �nico de retiro
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const codigo = `RET${timestamp}${random}`;

        // 4. Iniciar transacci�n
        db.beginTransaction((transErr) => {
          if (transErr) {
            console.error('[RETIRO] Error al iniciar transacci�n:', transErr);
            return res.status(500).json({ 
              success: false, 
              message: 'Error al procesar el retiro' 
            });
          }

          // 5. Descontar el saldo de la cuenta
          const updateBalanceSql = 'UPDATE cAccount SET balance = balance - ? WHERE accNum = ? AND mainId = ?';
          
          db.query(updateBalanceSql, [amount, accNum, mainId], (updateErr) => {
            if (updateErr) {
              return db.rollback(() => {
                console.error('[RETIRO] Error al actualizar saldo:', updateErr);
                res.status(500).json({ 
                  success: false, 
                  message: 'Error al actualizar el saldo' 
                });
              });
            }

            // 6. Registrar el retiro
            const insertRetiroSql = `
              INSERT INTO retiros (mainId, accNum, amount, description, withdrawdate) 
              VALUES (?, ?, ?, ?, NOW())
            `;
            
            db.query(insertRetiroSql, [mainId, accNum, amount, description || 'Retiro sin tarjeta'], (insertErr, result) => {
              if (insertErr) {
                return db.rollback(() => {
                  console.error('[RETIRO] Error al registrar retiro:', insertErr);
                  res.status(500).json({ 
                    success: false, 
                    message: 'Error al registrar el retiro' 
                  });
                });
              }

              const newBalance = account.balance - amount;

              // 7. Confirmar transacci�n
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error('[RETIRO] Error al confirmar transacci�n:', commitErr);
                    res.status(500).json({ 
                      success: false, 
                      message: 'Error al confirmar el retiro' 
                    });
                  });
                }

                console.log('[RETIRO] Retiro exitoso', { 
                  withdrawid: result.insertId, 
                  codigo, 
                  amount 
                });

                // 8. Enviar correo electr�nico
                emailService.sendWithdrawalCodeEmail(userEmail, {
                  customerName,
                  codigo,
                  amount,
                  accNum,
                  withdrawDate: new Date(),
                  newBalance
                }).catch(emailErr => {
                  console.error('[RETIRO] Error al enviar email:', emailErr);
                  // No fallar la operaci�n si el email falla
                });

                // 9. Responder al frontend
                res.json({ 
                  success: true, 
                  message: 'Retiro generado exitosamente',
                  codigo: codigo,
                  withdrawid: result.insertId,
                  amount: amount,
                  newBalance: newBalance
                });
              });
            });
          });
        });
      });
    });

      } catch (bcryptError) {
        console.error('[RETIRO] Error al comparar contrase�a:', bcryptError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar la contrase�a' 
        });
      }
    }); // Cierre del callback de verificaci�n de contrase�a

  } catch (error) {
    console.error('[RETIRO] Error general:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

/**
 * Obtener retiros recientes de un usuario
 */
const getRetirosRecientes = (req, res) => {
  const { mainId } = req.params;

  if (!mainId) {
    return res.status(400).json({ 
      success: false, 
      message: 'mainId es requerido' 
    });
  }

  const sql = `
    SELECT withdrawid, accNum, amount, description, withdrawdate
    FROM retiros
    WHERE mainId = ?
    ORDER BY withdrawdate DESC
    LIMIT 10
  `;

  db.query(sql, [mainId], (err, results) => {
    if (err) {
      console.error('[RETIRO] Error al obtener retiros recientes:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener retiros' 
      });
    }

    res.json({ 
      success: true, 
      retiros: results || [] 
    });
  });
};

/**
 * Validar c�digo de retiro
 * (Para uso futuro por empleados/cajeros)
 */
const validarCodigoRetiro = (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ 
      success: false, 
      message: 'C�digo es requerido' 
    });
  }

  const sql = `
    SELECT r.withdrawid, r.mainId, r.accNum, r.amount, r.description, r.withdrawdate,
           c.firstName, c.lastNameP, c.lastNameM,
           ca.balance
    FROM retiros r
    INNER JOIN customer c ON r.mainId = c.mainId
    INNER JOIN cAccount ca ON r.accNum = ca.accNum
    WHERE r.withdrawid = ?
    AND DATE(r.withdrawdate) >= DATE(NOW() - INTERVAL 1 DAY)
  `;

  // Extraer el ID del c�digo (los �ltimos d�gitos despu�s de RET)
  const withdrawId = codigo.replace('RET', '').slice(0, -4);

  db.query(sql, [withdrawId], (err, results) => {
    if (err) {
      console.error('[RETIRO] Error al validar c�digo:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al validar c�digo' 
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'C�digo inv�lido o expirado' 
      });
    }

    const retiro = results[0];
    res.json({ 
      success: true, 
      retiro: {
        withdrawid: retiro.withdrawid,
        cliente: `${retiro.firstName} ${retiro.lastNameP} ${retiro.lastNameM}`,
        cuenta: retiro.accNum,
        monto: retiro.amount,
        descripcion: retiro.description,
        fecha: retiro.withdrawdate
      }
    });
  });
};

/**
 * Procesar retiro con c�digo
 * (Para uso futuro por empleados/cajeros)
 */
const procesarRetiroConCodigo = (req, res) => {
  const { codigo, empleadoId } = req.body;

  if (!codigo) {
    return res.status(400).json({ 
      success: false, 
      message: 'C�digo es requerido' 
    });
  }

  // Extraer el ID del c�digo
  const withdrawId = codigo.replace('RET', '').slice(0, -4);

  const sql = `
    SELECT withdrawid, mainId, accNum, amount, withdrawdate
    FROM retiros
    WHERE withdrawid = ?
    AND DATE(withdrawdate) >= DATE(NOW() - INTERVAL 1 DAY)
  `;

  db.query(sql, [withdrawId], (err, results) => {
    if (err) {
      console.error('[RETIRO] Error al procesar retiro:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al procesar retiro' 
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'C�digo inv�lido o expirado' 
      });
    }

    const retiro = results[0];

    // Aqu� se podr�a agregar l�gica adicional:
    // - Marcar el retiro como procesado
    // - Registrar qui�n lo proces�
    // - Enviar notificaci�n al cliente
    // etc.

    console.log('[RETIRO] Retiro procesado por empleado', { 
      withdrawId, 
      empleadoId, 
      amount: retiro.amount 
    });

    res.json({ 
      success: true, 
      message: 'Retiro procesado exitosamente',
      retiro: {
        withdrawid: retiro.withdrawid,
        monto: retiro.amount,
        cuenta: retiro.accNum
      }
    });
  });
};

const getAccountStatement = (req, res) => {
  const { accountId } = req.params;
  
  if (!accountId) {
    return res.status(400).json({ 
      success: false,
      msg: 'Se requiere el ID de la cuenta' 
    });
  }

  const accountInfoSql = `
    SELECT 
      ca.accountId,
      ca.mainId,
      ca.cardNum,
      ca.balance,
      ca.clabe,
      ca.accNum,
      ca.accPhone,
      ca.accType,
      COALESCE(c.firstName, e.firstName) AS firstName,
      COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
      COALESCE(c.lastNameM, e.lastNameM) AS lastNameM
    FROM cAccount ca
    LEFT JOIN customer c ON ca.mainId = c.mainId
    LEFT JOIN employee e ON ca.mainId = e.mainId
    WHERE ca.accountId = ?
  `;

  db.query(accountInfoSql, [accountId], (err, accountResults) => {
    if (err) {
      console.error('[STATEMENT] Error al obtener info de cuenta:', err);
      return res.status(500).json({ 
        success: false,
        msg: 'Error al obtener información de la cuenta' 
      });
    }

    if (accountResults.length === 0) {
      return res.status(404).json({ 
        success: false,
        msg: 'Cuenta no encontrada' 
      });
    }

    const accountInfo = accountResults[0];
    const accNum = accountInfo.accNum;
    const clabe = accountInfo.clabe;

    const movementsSql = `
      SELECT 
        'transfer_out' as type,
        t.tranId as id,
        t.doDate as date,
        t.ammount as amount,
        t.fee,
        t.description,
        t.destiny,
        t.origin,
        NULL as withdrawid,
        NULL as depId
      FROM transfer t
      WHERE t.origin = ? OR t.origin = ?
      
      UNION ALL
      
      SELECT 
        'transfer_in' as type,
        t.tranId as id,
        t.doDate as date,
        t.ammount as amount,
        0 as fee,
        t.description,
        t.destiny,
        t.origin,
        NULL as withdrawid,
        NULL as depId
      FROM transfer t
      WHERE t.destiny = ? OR t.destiny = ?
      
      UNION ALL
      
      SELECT 
        'deposit' as type,
        NULL as id,
        d.depositDate as date,
        d.amount,
        0 as fee,
        d.description,
        d.accNum as destiny,
        NULL as origin,
        NULL as withdrawid,
        d.depId
      FROM deposito d
      WHERE d.accNum = ?
      
      UNION ALL
      
      SELECT 
        'withdrawal' as type,
        NULL as id,
        r.withdrawdate as date,
        r.amount,
        0 as fee,
        r.description,
        r.accNum as destiny,
        NULL as origin,
        r.withdrawid,
        NULL as depId
      FROM retiros r
      WHERE r.accNum = ?
      
      ORDER BY date DESC
      LIMIT 500
    `;

    db.query(movementsSql, [accNum, clabe, accNum, clabe, accNum, accNum], (err, movements) => {
      if (err) {
        console.error('[STATEMENT] Error al obtener movimientos:', err);
        return res.status(500).json({ 
          success: false,
          msg: 'Error al obtener movimientos' 
        });
      }

      let runningBalance = accountInfo.balance;
      const formattedMovements = [];

      for (let i = movements.length - 1; i >= 0; i--) {
        const mov = movements[i];
        formattedMovements.unshift({
          type: mov.type,
          id: mov.id || mov.depId || mov.withdrawid,
          date: mov.date,
          amount: parseFloat(mov.amount || 0),
          fee: parseFloat(mov.fee || 0),
          description: mov.description,
          destiny: mov.destiny,
          origin: mov.origin,
          balance: runningBalance
        });

        if (mov.type === 'transfer_out') {
          runningBalance += (parseFloat(mov.amount) + parseFloat(mov.fee));
        } else if (mov.type === 'transfer_in') {
          runningBalance -= parseFloat(mov.amount);
        } else if (mov.type === 'deposit') {
          runningBalance -= parseFloat(mov.amount);
        } else if (mov.type === 'withdrawal') {
          runningBalance += parseFloat(mov.amount);
        }
      }

      return res.json({
        success: true,
        accountInfo: {
          accountId: accountInfo.accountId,
          accNum: accountInfo.accNum,
          clabe: accountInfo.clabe,
          balance: parseFloat(accountInfo.balance),
          cardNum: accountInfo.cardNum,
          accType: accountInfo.accType,
          accountHolder: `${accountInfo.firstName} ${accountInfo.lastNameP} ${accountInfo.lastNameM || ''}`.trim()
        },
        movements: formattedMovements,
        totalMovements: formattedMovements.length
      });
    });
  });
};

// ========================================
// LÍNEA DE CRÉDITO
// ========================================

/**
 * Realiza una disposición de crédito (usar el crédito disponible)
 */
const disposeCreditFunds = (req, res) => {
  const { accountId, amount, description } = req.body;

  console.log('[CREDIT DISPOSAL] ========== NUEVA DISPOSICIÓN ==========');
  console.log('[CREDIT DISPOSAL] Body recibido:', { accountId, amount, description });

  // Validaciones
  if (!accountId || !amount) {
    console.log('[CREDIT DISPOSAL] ❌ Error: Faltan parámetros');
    return res.status(400).json({
      success: false,
      msg: 'Se requiere accountId y amount'
    });
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    console.log('[CREDIT DISPOSAL] ❌ Error: Monto inválido');
    return res.status(400).json({
      success: false,
      msg: 'El monto debe ser un número mayor a 0'
    });
  }

  const numericAmount = Number(amount);
  const finalDescription = description || 'Disposición de crédito';

  console.log('[CREDIT DISPOSAL] Llamando a sp_dispose_credit con:');
  console.log(`  - accountId: ${accountId}`);
  console.log(`  - amount: ${numericAmount}`);
  console.log(`  - description: ${finalDescription}`);

  const query = 'CALL sp_dispose_credit(?, ?, ?)';

  db.query(query, [accountId, numericAmount, finalDescription], (err, results) => {
    if (err) {
      console.log('[CREDIT DISPOSAL] ❌ Error en el SP:', err.message);
      return res.status(500).json({
        success: false,
        msg: err.sqlMessage || err.message || 'Error al realizar la disposición'
      });
    }

    console.log('[CREDIT DISPOSAL] ✅ Disposición exitosa');
    console.log('[CREDIT DISPOSAL] Resultado del SP:', results[0][0]);

    const result = results[0][0];

    // Enviar email de confirmación
    const emailQuery = `
      SELECT u.name, u.mail, c.accNum
      FROM cAccount c
      JOIN usuario u ON c.mainId = u.mainId
      WHERE c.accountId = ?
    `;
    
    db.query(emailQuery, [accountId], (emailErr, emailResults) => {
      if (!emailErr && emailResults && emailResults.length > 0) {
        const customer = emailResults[0];
        console.log('[CREDIT DISPOSAL] Enviando email a:', customer.mail);
        
        const emailData = {
          customerName: customer.name,
          amount: numericAmount,
          accNum: customer.accNum,
          timestamp: new Date(),
          description: finalDescription,
          disposalId: result.disposalId,
          creditLimit: result.creditLimit,
          usedCredit: result.usedCredit,
          availableAfter: result.availableAfter
        };
        
        emailService.sendCreditDisposalEmail(customer.mail, emailData)
          .then(() => {
            console.log('[CREDIT DISPOSAL] ✅ Email enviado exitosamente');
          })
          .catch(err => {
            console.log('[CREDIT DISPOSAL] ⚠️ Error al enviar email:', err.message);
          });
      } else {
        console.log('[CREDIT DISPOSAL] ⚠️ No se pudo obtener información para enviar email');
      }
    });

    res.json({
      success: true,
      disposalId: result.disposalId,
      availableAfter: result.availableAfter,
      creditLimit: result.creditLimit,
      usedCredit: result.usedCredit,
      msg: result.message || 'Disposición realizada exitosamente'
    });
  });
};

/**
 * Obtiene la información del crédito (límite, usado, disponible)
 */
const getCreditInfo = (req, res) => {
  const { accountId } = req.params;

  console.log('[CREDIT INFO] Consultando información para cuenta:', accountId);

  if (!accountId || isNaN(accountId)) {
    console.log('[CREDIT INFO] ❌ Error: accountId inválido');
    return res.status(400).json({
      success: false,
      msg: 'ID de cuenta inválido'
    });
  }

  const query = `
    SELECT 
      ca.accountId,
      ca.accNum,
      ca.clabe,
      ca.cardNum,
      ca.balance,
      ca.accType,
      ca.mainId,
      fn_calculate_credit_limit(ca.mainId) AS creditLimit,
      -- balance = deuda, disponible = límite - deuda
      CASE 
        WHEN ca.accType = 'Credito' THEN (fn_calculate_credit_limit(ca.mainId) - ca.balance)
        ELSE 0
      END AS available,
      -- usado = deuda actual
      CASE 
        WHEN ca.accType = 'Credito' THEN ca.balance
        ELSE 0
      END AS used,
      -- porcentaje usado = (deuda / límite) * 100
      CASE 
        WHEN ca.accType = 'Credito' AND fn_calculate_credit_limit(ca.mainId) > 0 
        THEN ROUND((ca.balance / fn_calculate_credit_limit(ca.mainId)) * 100, 2)
        ELSE 0
      END AS usedPercentage
    FROM cAccount ca
    WHERE ca.accountId = ?
  `;

  db.query(query, [accountId], (err, results) => {
    if (err) {
      console.log('[CREDIT INFO] ❌ Error en la consulta:', err.message);
      return res.status(500).json({
        success: false,
        msg: 'Error al obtener información de crédito'
      });
    }

    if (results.length === 0) {
      console.log('[CREDIT INFO] ❌ Cuenta no encontrada');
      return res.status(404).json({
        success: false,
        msg: 'Cuenta no encontrada'
      });
    }

    const account = results[0];

    if (account.accType !== 'Credito') {
      console.log('[CREDIT INFO] ❌ No es una cuenta de crédito');
      return res.status(400).json({
        success: false,
        msg: 'Esta no es una cuenta de crédito'
      });
    }

    console.log('[CREDIT INFO] ✅ Información obtenida correctamente');
    console.log('[CREDIT INFO] Límite:', account.creditLimit);
    console.log('[CREDIT INFO] Usado:', account.used);
    console.log('[CREDIT INFO] Disponible:', account.available);

    res.json({
      success: true,
      creditInfo: {
        accountId: account.accountId,
        accNum: account.accNum,
        clabe: account.clabe,
        cardNum: account.cardNum,
        creditLimit: parseFloat(account.creditLimit),
        used: parseFloat(account.used),
        available: parseFloat(account.available),
        usedPercentage: parseFloat(account.usedPercentage),
        balance: parseFloat(account.balance)
      }
    });
  });
};

/**
 * Obtiene el historial de disposiciones de crédito
 */
const getCreditHistory = (req, res) => {
  const { accountId } = req.params;

  console.log('[CREDIT HISTORY] Consultando historial para cuenta:', accountId);

  if (!accountId || isNaN(accountId)) {
    console.log('[CREDIT HISTORY] ❌ Error: accountId inválido');
    return res.status(400).json({
      success: false,
      msg: 'ID de cuenta inválido'
    });
  }

  const query = `
    SELECT 
      disposalId,
      accountId,
      amount,
      description,
      timestamp,
      availableAfter
    FROM creditDisposal
    WHERE accountId = ?
    ORDER BY timestamp DESC
  `;

  db.query(query, [accountId], (err, results) => {
    if (err) {
      console.log('[CREDIT HISTORY] ❌ Error en la consulta:', err.message);
      return res.status(500).json({
        success: false,
        msg: 'Error al obtener el historial de disposiciones'
      });
    }

    console.log('[CREDIT HISTORY] ✅ Historial obtenido:', results.length, 'disposiciones');

    const disposals = results.map(d => ({
      disposalId: d.disposalId,
      accountId: d.accountId,
      amount: parseFloat(d.amount),
      description: d.description,
      date: d.timestamp,
      availableAfter: parseFloat(d.availableAfter)
    }));

    res.json({
      success: true,
      disposals,
      total: disposals.length
    });
  });
};

/**
 * Envía el historial de crédito por correo electrónico
 */
const sendCreditHistoryByEmail = (req, res) => {
  const { accountId } = req.body;

  console.log('[SEND CREDIT HISTORY] Preparando envío de historial para cuenta:', accountId);

  if (!accountId || isNaN(accountId)) {
    console.log('[SEND CREDIT HISTORY] ❌ Error: accountId inválido');
    return res.status(400).json({
      success: false,
      msg: 'ID de cuenta inválido'
    });
  }

  // Primero obtener la información de la cuenta y el usuario
  const accountQuery = `
    SELECT u.name, u.mail, c.accNum
    FROM cAccount c
    JOIN usuario u ON c.mainId = u.mainId
    WHERE c.accountId = ? AND c.accType = 'Credito'
  `;

  db.query(accountQuery, [accountId], (err, accountResults) => {
    if (err) {
      console.log('[SEND CREDIT HISTORY] ❌ Error al obtener información de la cuenta:', err.message);
      return res.status(500).json({
        success: false,
        msg: 'Error al obtener información de la cuenta'
      });
    }

    if (!accountResults || accountResults.length === 0) {
      console.log('[SEND CREDIT HISTORY] ❌ Error: Cuenta no encontrada');
      return res.status(404).json({
        success: false,
        msg: 'Cuenta de crédito no encontrada'
      });
    }

    const customer = accountResults[0];

    // Luego obtener el historial de disposiciones
    const historyQuery = `
      SELECT 
        disposalId,
        amount,
        description,
        timestamp,
        availableAfter
      FROM creditDisposal
      WHERE accountId = ?
      ORDER BY timestamp DESC
    `;

    db.query(historyQuery, [accountId], (err, historyResults) => {
      if (err) {
        console.log('[SEND CREDIT HISTORY] ❌ Error al obtener historial:', err.message);
        return res.status(500).json({
          success: false,
          msg: 'Error al obtener el historial de disposiciones'
        });
      }

      if (!historyResults || historyResults.length === 0) {
        console.log('[SEND CREDIT HISTORY] ⚠️ No hay disposiciones en el historial');
        return res.status(404).json({
          success: false,
          msg: 'No hay disposiciones en el historial para enviar'
        });
      }

      // Formatear las disposiciones
      const disposals = historyResults.map(d => ({
        disposalId: d.disposalId,
        amount: parseFloat(d.amount),
        description: d.description,
        date: d.timestamp,
        availableAfter: parseFloat(d.availableAfter)
      }));

      // Calcular el total dispuesto
      const totalDisposed = disposals.reduce((sum, d) => sum + d.amount, 0);

      // Calcular el período
      const oldestDate = new Date(disposals[disposals.length - 1].date);
      const newestDate = new Date(disposals[0].date);
      const period = `${oldestDate.toLocaleDateString('es-MX')} - ${newestDate.toLocaleDateString('es-MX')}`;

      // Preparar datos para el email
      const emailData = {
        customerName: customer.name,
        accNum: customer.accNum,
        disposals: disposals,
        period: period,
        totalDisposed: totalDisposed
      };

      console.log('[SEND CREDIT HISTORY] Enviando email a:', customer.mail);

      // Enviar el email
      emailService.sendCreditHistoryEmail(customer.mail, emailData)
        .then(() => {
          console.log('[SEND CREDIT HISTORY] ✅ Email enviado exitosamente');
          res.json({
            success: true,
            msg: 'Historial enviado por correo electrónico exitosamente'
          });
        })
        .catch(err => {
          console.log('[SEND CREDIT HISTORY] ❌ Error al enviar email:', err.message);
          res.status(500).json({
            success: false,
            msg: 'Error al enviar el historial por correo'
          });
        });
    });
  });
};

/**
 * Envía el estado de cuenta con PDF por correo electrónico
 */
const sendAccountStatementByEmail = (req, res) => {
  const { accountId } = req.body;

  console.log('[SEND STATEMENT] Preparando envío de estado de cuenta para cuenta:', accountId);

  if (!accountId || isNaN(accountId)) {
    console.log('[SEND STATEMENT] ❌ Error: accountId inválido');
    return res.status(400).json({
      success: false,
      msg: 'ID de cuenta inválido'
    });
  }

  // Reutilizar la lógica de getAccountStatement
  const accountInfoSql = `
    SELECT 
      ca.accountId,
      ca.mainId,
      ca.cardNum,
      ca.balance,
      ca.clabe,
      ca.accNum,
      ca.accPhone,
      ca.accType,
      COALESCE(c.firstName, e.firstName) AS firstName,
      COALESCE(c.lastNameP, e.lastNameP) AS lastNameP,
      COALESCE(c.lastNameM, e.lastNameM) AS lastNameM,
      m.mail AS mail
    FROM cAccount ca
    LEFT JOIN customer c ON ca.mainId = c.mainId
    LEFT JOIN employee e ON ca.mainId = e.mainId
    JOIN main m ON ca.mainId = m.mainId
    WHERE ca.accountId = ?
  `;

  db.query(accountInfoSql, [accountId], (err, accountResults) => {
    if (err) {
      console.error('[SEND STATEMENT] Error al obtener info de cuenta:', err);
      return res.status(500).json({ 
        success: false,
        msg: 'Error al obtener información de la cuenta' 
      });
    }

    if (accountResults.length === 0) {
      return res.status(404).json({ 
        success: false,
        msg: 'Cuenta no encontrada' 
      });
    }

    const accountInfo = accountResults[0];
    const accNum = accountInfo.accNum;
    const clabe = accountInfo.clabe;
    const customerEmail = accountInfo.mail;

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        msg: 'No se encontró correo electrónico del titular'
      });
    }

    const movementsSql = `
      SELECT 
        'transfer_out' as type,
        t.tranId as id,
        t.doDate as date,
        t.ammount as amount,
        t.fee,
        t.description,
        t.destiny,
        t.origin
      FROM transfer t
      WHERE t.origin = ? OR t.origin = ?
      
      UNION ALL
      
      SELECT 
        'transfer_in' as type,
        t.tranId as id,
        t.doDate as date,
        t.ammount as amount,
        0 as fee,
        t.description,
        t.destiny,
        t.origin
      FROM transfer t
      WHERE t.destiny = ? OR t.destiny = ?
      
      UNION ALL
      
      SELECT 
        'deposit' as type,
        d.depId as id,
        d.depositDate as date,
        d.amount,
        0 as fee,
        d.description,
        d.accNum as destiny,
        NULL as origin
      FROM deposito d
      WHERE d.accNum = ?
      
      UNION ALL
      
      SELECT 
        'withdrawal' as type,
        r.withdrawid as id,
        r.withdrawdate as date,
        r.amount,
        0 as fee,
        r.description,
        r.accNum as destiny,
        NULL as origin
      FROM retiros r
      WHERE r.accNum = ?
      
      ORDER BY date DESC
      LIMIT 100
    `;

    db.query(movementsSql, [accNum, clabe, accNum, clabe, accNum, accNum], (err, movements) => {
      if (err) {
        console.error('[SEND STATEMENT] Error al obtener movimientos:', err);
        return res.status(500).json({ 
          success: false,
          msg: 'Error al obtener movimientos' 
        });
      }

      // Formatear movimientos con saldo
      let runningBalance = accountInfo.balance;
      const formattedMovements = [];

      for (let i = movements.length - 1; i >= 0; i--) {
        const mov = movements[i];
        formattedMovements.unshift({
          type: mov.type,
          id: mov.id,
          date: mov.date,
          amount: parseFloat(mov.amount || 0),
          fee: parseFloat(mov.fee || 0),
          description: mov.description,
          destiny: mov.destiny,
          origin: mov.origin,
          balance: runningBalance
        });

        if (mov.type === 'transfer_out') {
          runningBalance += (parseFloat(mov.amount) + parseFloat(mov.fee));
        } else if (mov.type === 'transfer_in') {
          runningBalance -= parseFloat(mov.amount);
        } else if (mov.type === 'deposit') {
          runningBalance -= parseFloat(mov.amount);
        } else if (mov.type === 'withdrawal') {
          runningBalance += parseFloat(mov.amount);
        }
      }

      const statementData = {
        accountInfo: {
          accountId: accountInfo.accountId,
          accNum: accountInfo.accNum,
          clabe: accountInfo.clabe,
          balance: parseFloat(accountInfo.balance),
          cardNum: accountInfo.cardNum,
          accType: accountInfo.accType,
          accountHolder: `${accountInfo.firstName} ${accountInfo.lastNameP} ${accountInfo.lastNameM || ''}`.trim()
        },
        movements: formattedMovements
      };

      // Generar PDF
      console.log('[SEND STATEMENT] Generando PDF...');
      pdfService.generateAccountStatementPDF(statementData)
        .then(pdfBuffer => {
          console.log('[SEND STATEMENT] PDF generado, enviando email...');

          const emailData = {
            customerName: accountInfo.firstName,
            accNum: accountInfo.accNum,
            accType: accountInfo.accType,
            balance: parseFloat(accountInfo.balance),
            totalMovements: formattedMovements.length
          };

          return emailService.sendAccountStatementEmail(customerEmail, emailData, pdfBuffer);
        })
        .then(() => {
          console.log('[SEND STATEMENT] ✅ Email enviado exitosamente');
          res.json({
            success: true,
            msg: 'Estado de cuenta enviado por correo electrónico exitosamente'
          });
        })
        .catch(err => {
          console.error('[SEND STATEMENT] ❌ Error:', err);
          res.status(500).json({
            success: false,
            msg: 'Error al generar o enviar el estado de cuenta'
          });
        });
    });
  });
};

const getUserInfo = (req, res) => {
  const mainId = parseInt(req.params.mainId);

  if (!mainId) {
    return res.status(400).json({
      success: false,
      message: 'mainId es requerido'
    });
  }

  const sql = `
    SELECT 
      m.mainId,
      m.mail,
      m.rol,
      COALESCE(c.firstName, e.firstName) as firstName,
      COALESCE(c.lastNameP, e.lastNameP) as lastNameP,
      COALESCE(c.lastNameM, e.lastNameM) as lastNameM,
      COALESCE(c.birthday, e.birthday) as birthday,
      COALESCE(c.address, e.address) as address,
      COALESCE(c.phoneNumber, e.phoneNumber) as phoneNumber,
      COALESCE(c.curp, e.curp) as curp,
      COALESCE(c.rfc, e.rfc) as rfc,
      COALESCE(c.enterDate, e.enterDate) as enterDate,
      e.nss
    FROM main m
    LEFT JOIN customer c ON m.mainId = c.mainId
    LEFT JOIN employee e ON m.mainId = e.mainId
    WHERE m.mainId = ?
  `;

  db.query(sql, [mainId], (err, results) => {
    if (err) {
      console.error('[GET USER INFO] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del usuario'
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: results[0]
    });
  });
};

const getUserMovements = (req, res) => {
  const mainId = parseInt(req.params.mainId);

  if (!mainId) {
    return res.status(400).json({
      success: false,
      message: 'mainId es requerido'
    });
  }

  // Query para obtener todas las transacciones del usuario
  const sql = `
    SELECT 
      'Transferencia Enviada' as tipo,
      t.origin as cuenta,
      t.destiny as destino,
      -t.ammount as monto,
      -t.fee as comision,
      t.description as descripcion,
      t.dodate as fecha
    FROM transfer t
    INNER JOIN caccount ca ON t.origin = ca.accnum
    WHERE ca.mainid = ?
    
    UNION ALL
    
    SELECT 
      'Transferencia Recibida' as tipo,
      t.destiny as cuenta,
      t.origin as destino,
      t.ammount as monto,
      0 as comision,
      t.description as descripcion,
      t.dodate as fecha
    FROM transfer t
    INNER JOIN caccount ca ON t.destiny = ca.accnum
    WHERE ca.mainid = ?
    
    UNION ALL
    
    SELECT 
      'Depósito' as tipo,
      d.accnum as cuenta,
      NULL as destino,
      d.amount as monto,
      0 as comision,
      d.description as descripcion,
      DATE(d.depositdate) as fecha
    FROM deposito d
    WHERE d.mainid = ?
    
    UNION ALL
    
    SELECT 
      'Retiro' as tipo,
      r.accnum as cuenta,
      NULL as destino,
      -r.amount as monto,
      0 as comision,
      r.description as descripcion,
      DATE(r.withdrawdate) as fecha
    FROM retiros r
    WHERE r.mainid = ?
    
    UNION ALL
    
    SELECT 
      'Disposición de Crédito' as tipo,
      ca.accnum as cuenta,
      NULL as destino,
      cd.amount as monto,
      0 as comision,
      cd.description as descripcion,
      DATE(cd.timestamp) as fecha
    FROM creditdisposal cd
    INNER JOIN caccount ca ON cd.accountid = ca.accountid
    WHERE ca.mainid = ?
    
    ORDER BY fecha DESC
    LIMIT 5
  `;

  db.query(sql, [mainId, mainId, mainId, mainId, mainId], (err, results) => {
    if (err) {
      console.error('[GET USER MOVEMENTS] Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener movimientos del usuario'
      });
    }

    res.json({
      success: true,
      data: results || []
    });
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
  getAccountStatement,
  disposeCreditFunds,
  getCreditInfo,
  getCreditHistory,
  sendCreditHistoryByEmail,
  sendAccountStatementByEmail,
  getUserInfo,
  getUserMovements
};
