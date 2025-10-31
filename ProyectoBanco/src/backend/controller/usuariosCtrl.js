const db = require('../db');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const emailService = require('../services/emailService');
const passwordResetService = require('../services/passwordResetService');

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
  console.log('🔵 [REGISTER] === INICIO DE REGISTRO ===');
  console.log('🔵 [REGISTER] Correo:', req.body.mail);
  console.log('🔵 [REGISTER] Rol:', req.body.rol);
  
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
    
    console.log('🔵 [REGISTER] Contraseña hasheada exitosamente');

    const checkUserQuery = 'SELECT * FROM main WHERE mail = ?';
    db.query(checkUserQuery, [mail], (err, results) => {
      if (err) {
        console.error('❌ [REGISTER] Error al verificar usuario existente:', err);
        return res.status(500).json({ msg: 'Error en el servidor' });
      }

      if (results.length > 0) {
        console.log('⚠️ [REGISTER] El correo ya existe en la BD');
        return res.status(400).json({ msg: 'El correo ya está registrado' });
      }
      
      console.log('🔵 [REGISTER] Correo disponible, insertando en tabla main...');

      const insertMainQuery = 'INSERT INTO main (mail, pass, rol) VALUES (?, ?, ?)';
      db.query(insertMainQuery, [mail, hashedPassword, rol], (err, mainResult) => {
        if (err) {
          console.error('❌ [REGISTER] Error al insertar en main:', err);
          return res.status(500).json({ msg: 'Error registrando usuario' });
        }

        const mainId = mainResult.insertId;
        console.log(`🔵 [REGISTER] Usuario insertado en main con ID: ${mainId}`);

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
              console.error('❌ [REGISTER] Error al insertar cliente:', err);
              return res.status(500).json({ msg: 'Error registrando cliente' });
            }

            console.log(`✅ [REGISTER] Cliente insertado correctamente, creando cuenta...`);

            createDefaultAccount(db, mainId, phoneNumber, (accErr, accountInfo) => {
              if (accErr) {
                console.error('❌ [REGISTER] Error al crear cuenta:', accErr);
                return res.status(201).json({
                  msg: 'Cliente registrado, pero falló la creación de la cuenta',
                  mainId: mainId
                });
              }
              
              console.log(`✅ [REGISTER] Cuenta creada correctamente`);
              
              // Enviar correos de forma asíncrona en segundo plano (sin bloquear la respuesta)
              const fullName = `${firstName} ${lastNameP} ${lastNameM || ''}`.trim();
              
              console.log(`📧 [REGISTER] Programando envío de correos a: ${mail}`);
              console.log(`📧 [REGISTER] Nombre completo: ${fullName}`);
              console.log(`📧 [REGISTER] Datos de cuenta:`, accountInfo);
              
              // Ejecutar envío de correos en segundo plano con setImmediate
              setImmediate(async () => {
                console.log(`📧 [REGISTER] Iniciando envío de correos a: ${mail}`);
                
                // Enviar correo de bienvenida
                try {
                  const welcomeResult = await emailService.sendWelcomeEmail(mail, {
                    customerName: fullName,
                    mail: mail
                  });
                  
                  if (welcomeResult.success) {
                    console.log(`✅ [REGISTER] Correo de bienvenida enviado exitosamente a: ${mail}`);
                  } else {
                    console.error(`❌ [REGISTER] Error al enviar correo de bienvenida: ${welcomeResult.error}`);
                  }
                } catch (emailErr) {
                  console.error('❌ [REGISTER] Excepción al enviar correo de bienvenida:', emailErr);
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
                    console.log(`✅ [REGISTER] Correo de cuenta creada enviado exitosamente a: ${mail}`);
                  } else {
                    console.error(`❌ [REGISTER] Error al enviar correo de cuenta creada: ${accountResult.error}`);
                  }
                } catch (emailErr) {
                  console.error('❌ [REGISTER] Excepción al enviar correo de cuenta creada:', emailErr);
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
            
            console.log(`📧 [REGISTER] Programando envío de correo de bienvenida a empleado: ${mail}`);
            console.log(`📧 [REGISTER] Nombre completo: ${fullName}`);
            
            // Ejecutar envío de correo en segundo plano con setImmediate
            setImmediate(async () => {
              console.log(`📧 [REGISTER] Iniciando envío de correo a empleado: ${mail}`);
              
              try {
                const welcomeResult = await emailService.sendWelcomeEmail(mail, {
                  customerName: fullName,
                  mail: mail
                });
                
                if (welcomeResult.success) {
                  console.log(`✅ [REGISTER] Correo de bienvenida enviado exitosamente a: ${mail}`);
                } else {
                  console.error(`❌ [REGISTER] Error al enviar correo de bienvenida: ${welcomeResult.error}`);
                }
              } catch (emailErr) {
                console.error('❌ [REGISTER] Excepción al enviar correo de bienvenida:', emailErr);
              }
            });
            
            // Responder inmediatamente sin esperar al correo
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
      const tranId = row.tranId || null;
      const fee = row.fee || 0;
      
      // ==================== ENVIAR CORREOS DESPUÉS DE LA TRANSFERENCIA ====================
      // Enviar correos de forma asíncrona sin bloquear la respuesta
      sendTransferEmails(origin, destiny, numericAmount, description, tranId, fee)
        .catch(emailErr => {
          console.error('❌ [TRANSFER] Error al enviar correos:', emailErr);
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

// ==================== FUNCIÓN AUXILIAR PARA ENVIAR CORREOS DE TRANSFERENCIA ====================
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
    
    // Obtener información del origen y destino
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
      
      console.log(`✅ [TRANSFER] Correo de transferencia enviada a: ${originData.mail}`);
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
      
      console.log(`✅ [TRANSFER] Correo de transferencia recibida a: ${destData.mail}`);
    }
    
  } catch (error) {
    console.error('❌ [TRANSFER] Error al enviar correos:', error);
    throw error;
  }
}

// ==================== CREACIÓN DE CUENTAS ====================

const createAccount = async (req, res) => {
  const { customerId, createdBy, accType, accPhone, password, curp } = req.body || {};
  
  // Validar campos requeridos
  if (!customerId || !createdBy || !accType || !accPhone || !password || !curp) {
    return res.status(400).json({ 
      success: false,
      msg: 'Todos los campos son requeridos: customerId, createdBy, accType, accPhone, password, curp' 
    });
  }

  // Validar que los IDs sean números
  const numericCustomerId = parseInt(customerId);
  const numericCreatedBy = parseInt(createdBy);
  
  if (isNaN(numericCustomerId) || isNaN(numericCreatedBy)) {
    return res.status(400).json({ 
      success: false,
      msg: 'customerId y createdBy deben ser números válidos' 
    });
  }

  // Validar formato de teléfono (10 dígitos)
  const sanitizedPhone = String(accPhone).replace(/\D/g, '');
  if (sanitizedPhone.length !== 10) {
    return res.status(400).json({ 
      success: false,
      msg: 'El teléfono debe tener exactamente 10 dígitos' 
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
    // 1️⃣ Verificar que el usuario creador (manager/empleado) tenga permisos
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

      // 2️⃣ Verificar que el cliente exista y obtener sus datos
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

        // 3️⃣ Verificar contraseña del cliente
        const isPasswordValid = await bcrypt.compare(password, customer.pass);
        if (!isPasswordValid) {
          return res.status(401).json({ 
            success: false,
            msg: 'Contraseña del cliente incorrecta' 
          });
        }

        // 4️⃣ Verificar CURP del cliente
        if (customer.curp !== sanitizedCurp) {
          return res.status(401).json({ 
            success: false,
            msg: 'El CURP no coincide con el registrado del cliente' 
          });
        }

        // 5️⃣ Generar números únicos para la cuenta
        const cardNum = generateCardNumber(numericCustomerId);
        const clabe = generateClabe();
        const accNum = generateAccNum(numericCustomerId);

        // 6️⃣ Insertar la nueva cuenta
        const insertSql = `
          INSERT INTO cAccount (mainId, cardNum, balance, clabe, accNum, accPhone, accType) 
          VALUES (?, ?, 0, ?, ?, ?, ?)
        `;
        
        db.query(insertSql, [numericCustomerId, cardNum, clabe, accNum, sanitizedPhone, accType], (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ 
                success: false,
                msg: 'Error: número de cuenta duplicado. Intenta nuevamente' 
              });
            }
            return res.status(500).json({ 
              success: false,
              msg: 'Error al crear la cuenta' 
            });
          }

          // 7️⃣ Respuesta exitosa
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

// ==================== GENERACIÓN DE COMPROBANTES ====================

const generateReceipt = (req, res) => {
  const { tranId } = req.params;

  console.log('📄 [RECEIPT] Solicitud de comprobante para tranId:', tranId);

  if (!tranId) {
    console.log('❌ [RECEIPT] tranId no proporcionado');
    return res.status(400).json({ 
      success: false,
      msg: 'Se requiere el ID de la transferencia' 
    });
  }

  // Primero: obtener datos básicos de la transferencia
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

  console.log('📊 [RECEIPT] Ejecutando query SQL para tranId:', tranId);

  db.query(sql, [tranId], (err, results) => {
    if (err) {
      console.error('❌ [RECEIPT] Error al consultar transferencia:', err);
      return res.status(500).json({ 
        success: false,
        msg: 'Error al obtener información de la transferencia',
        error: err.message
      });
    }

    console.log('✅ [RECEIPT] Query ejecutado, resultados:', results.length);

    if (results.length === 0) {
      console.log('⚠️ [RECEIPT] Transferencia no encontrada para tranId:', tranId);
      return res.status(404).json({ 
        success: false,
        msg: 'Transferencia no encontrada' 
      });
    }

    const transfer = results[0];
    console.log('📄 [RECEIPT] Datos obtenidos:', transfer);

    // Segundo: obtener nombres de los dueños de las cuentas
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
        console.error('⚠️ [RECEIPT] Error al obtener nombres (continuando sin nombres):', errNames);
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

      console.log('📄 [RECEIPT] Nombres obtenidos - Origen:', originName, 'Destino:', destName);

      try {
        // Crear documento PDF
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          bufferPages: true
        });

        console.log('📄 [RECEIPT] Generando PDF...');

        // Configurar headers para enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=comprobante-${tranId}.pdf`);

        // Pipe del PDF a la respuesta
        doc.pipe(res);

      // ========== DISEÑO DEL COMPROBANTE (estilo BBVA) ==========

      // 1. HEADER - Logo y nombre del banco
      doc.fontSize(36)
         .fillColor('#072146')
         .text('BANCO JETY', 50, 50);

      // 2. TÍTULO
      doc.fontSize(20)
         .fillColor('#000000')
         .text('Comprobante de la operación', 50, 105);

      // Línea separadora
      doc.moveTo(50, 145)
         .lineTo(545, 145)
         .strokeColor('#072146')
         .lineWidth(2)
         .stroke();

      let yPos = 165;

      // 3. TIPO DE OPERACIÓN
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Tipo de operación', 50, yPos);
      
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

      // 6. NOMBRE DEL ORDENANTE (dueño de cuenta origen)
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

      // 8. NOMBRE DEL BENEFICIARIO (dueño de cuenta destino)
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

      // 12. FECHA DE OPERACIÓN (hora actual real del servidor)
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Fecha de operación', 50, yPos);

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

      // 11. FOLIO DE OPERACIÓN
      doc.fontSize(11)
         .fillColor('#666666')
         .text('Folio de operación', 50, yPos);

      yPos += 18;
      const folio = transfer.tranId.toString().padStart(10, '0');
      doc.fontSize(14)
         .fillColor('#000000')
         .text(folio, 50, yPos);

      yPos += 35;

      // 13. COMISIÓN (si existe)
      if (transfer.fee && transfer.fee > 0) {
        doc.fontSize(11)
           .fillColor('#666666')
           .text('Comisión', 50, yPos);

        yPos += 18;
        doc.fontSize(13)
           .fillColor('#000000')
           .text(`$ ${Number(transfer.fee).toFixed(2)}`, 50, yPos);
      }

      // 14. FOOTER
      doc.fontSize(9)
         .fillColor('#999999')
         .text('Este comprobante es válido sin firma autógrafa', 50, 750, {
           width: 495,
           align: 'center'
         });

      doc.fontSize(8)
         .text('Banco Jety - Sistema de Banca en Línea', 50, 770, {
           width: 495,
           align: 'center'
         });

      // Finalizar el PDF
      doc.end();

        console.log(`✅ [RECEIPT] Comprobante PDF generado exitosamente para transferencia #${tranId}`);

      } catch (pdfError) {
        console.error('❌ [RECEIPT] Error al generar PDF:', pdfError);
        // Si ya se envió el header, no podemos enviar JSON
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

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================

/**
 * Solicita recuperación de contraseña - Genera token y envía correo
 */
const requestPasswordReset = async (req, res) => {
  const { mail } = req.body;
  
  if (!mail) {
    return res.status(400).json({ 
      success: false,
      msg: 'El correo electrónico es requerido' 
    });
  }
  
  try {
    // Verificar que el usuario existe
    const query = 'SELECT mainId, mail FROM main WHERE mail = ?';
    
    db.query(query, [mail], async (err, results) => {
      if (err) {
        console.error('❌ [PASSWORD-RESET] Error al buscar usuario:', err);
        return res.status(500).json({ 
          success: false,
          msg: 'Error en el servidor' 
        });
      }
      
      // Por seguridad, no revelar si el correo existe o no
      if (!results || results.length === 0) {
        console.log(`⚠️ [PASSWORD-RESET] Correo no encontrado: ${mail}`);
        // Responder como si fuera exitoso para no dar pistas
        return res.json({ 
          success: true,
          msg: 'Si el correo existe, recibirás un enlace de recuperación' 
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
        
        // Crear enlace de recuperación
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
            console.log(`✅ [PASSWORD-RESET] Correo de recuperación enviado a: ${mail}`);
            res.json({ 
              success: true,
              msg: 'Correo de recuperación enviado exitosamente' 
            });
          } else {
            console.error('❌ [PASSWORD-RESET] Error al enviar correo:', emailResult.error);
            res.status(500).json({ 
              success: false,
              msg: 'Error al enviar el correo de recuperación' 
            });
          }
        }).catch(error => {
          console.error('❌ [PASSWORD-RESET] Error al enviar correo:', error);
          res.status(500).json({ 
            success: false,
            msg: 'Error al enviar el correo de recuperación' 
          });
        });
      });
    });
    
  } catch (error) {
    console.error('❌ [PASSWORD-RESET] Error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Error en el servidor' 
    });
  }
};

/**
 * Restablece la contraseña con el token
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
      console.log(`⚠️ [PASSWORD-RESET] Token inválido: ${verification.reason}`);
      return res.status(400).json({ 
        success: false,
        msg: verification.reason 
      });
    }
    
    // Verificar que el usuario existe
    const query = 'SELECT mainId, mail FROM main WHERE mail = ?';
    
    db.query(query, [mail], async (err, results) => {
      if (err) {
        console.error('❌ [PASSWORD-RESET] Error al buscar usuario:', err);
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
      
      // Hash de la nueva contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Actualizar contraseña
      const updateQuery = 'UPDATE main SET pass = ? WHERE mail = ?';
      
      db.query(updateQuery, [hashedPassword, mail], async (updateErr, updateResult) => {
        if (updateErr) {
          console.error('❌ [PASSWORD-RESET] Error al actualizar contraseña:', updateErr);
          return res.status(500).json({ 
            success: false,
            msg: 'Error al actualizar la contraseña' 
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
          
          // Enviar correo de confirmación
          emailService.sendPasswordChangedEmail(mail, {
            customerName: customerName,
            date: new Date().toLocaleString('es-MX'),
            ipAddress: req.ip || 'No disponible'
          }).then(() => {
            console.log(`✅ [PASSWORD-RESET] Correo de confirmación enviado a: ${mail}`);
          }).catch(emailErr => {
            console.error('❌ [PASSWORD-RESET] Error al enviar correo de confirmación:', emailErr);
          });
          
          console.log(`✅ [PASSWORD-RESET] Contraseña actualizada para: ${mail}`);
          res.json({ 
            success: true,
            msg: 'Contraseña actualizada exitosamente' 
          });
        });
      });
    });
    
  } catch (error) {
    console.error('❌ [PASSWORD-RESET] Error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Error en el servidor' 
    });
  }
};

// ==================== DEPÓSITOS ====================

const depositFunds = (req, res) => {
  console.log('💰 [DEPOSIT] Solicitud de depósito recibida');
  console.log('💰 [DEPOSIT] Body:', JSON.stringify(req.body, null, 2));
  
  const { mainId, amount, description } = req.body || {};
  
  if (!mainId || !amount) {
    console.log('❌ [DEPOSIT] Campos faltantes:', { mainId, amount });
    return res.status(400).json({ 
      success: false,
      msg: 'Los campos mainId y amount son requeridos' 
    });
  }

  const numericMainId = parseInt(mainId);
  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericMainId) || numericMainId <= 0) {
    console.log('❌ [DEPOSIT] mainId inválido:', mainId);
    return res.status(400).json({ 
      success: false,
      msg: 'El mainId debe ser un número válido' 
    });
  }
  
  if (isNaN(numericAmount) || numericAmount <= 0) {
    console.log('❌ [DEPOSIT] Monto inválido:', amount);
    return res.status(400).json({ 
      success: false,
      msg: 'El monto debe ser un número mayor a 0' 
    });
  }

  const sql = `CALL sp_deposit_funds(?, ?, ?)`;
  const params = [numericMainId, numericAmount, description || 'Depósito en efectivo'];
  
  console.log('💰 [DEPOSIT] Ejecutando SP con params:', params);
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ [DEPOSIT] Error en SP:', err);
      console.error('❌ [DEPOSIT] SQL State:', err.sqlState);
      console.error('❌ [DEPOSIT] SQL Message:', err.sqlMessage);
      const msg = err?.sqlMessage || err?.message || 'Error en depósito';
      return res.status(400).json({ 
        success: false,
        msg: msg 
      });
    }

    console.log('✅ [DEPOSIT] SP ejecutado, results:', results);

    try {
      const firstResultSet = Array.isArray(results) && results.length > 0 ? results[0] : [];
      const row = firstResultSet[0] || {};
      const depId = row.depId || null;
      const newBalance = row.newBalance || 0;
      const accountNumber = row.accountNumber || '';
      
      console.log('✅ [DEPOSIT] Datos extraídos:', { depId, newBalance, accountNumber });
      
      // ==================== ENVIAR CORREO DESPUÉS DEL DEPÓSITO ====================
      // Enviar correo de forma asíncrona sin bloquear la respuesta
      sendDepositEmail(accountNumber, numericAmount, description, depId, newBalance)
        .catch(emailErr => {
          console.error('❌ [DEPOSIT] Error al enviar correo:', emailErr);
          // No afectar la respuesta del depósito si falla el correo
        });
      
      return res.json({ 
        success: true, 
        depId: depId, 
        newBalance: newBalance,
        msg: 'Depósito realizado exitosamente'
      });
      
    } catch (e) {
      return res.status(500).json({ 
        success: false,
        msg: 'Error procesando la respuesta del depósito' 
      });
    }
  });
};

// ==================== FUNCIÓN AUXILIAR PARA ENVIAR CORREO DE DEPÓSITO ====================
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
    
    // Obtener información de la cuenta destino
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
      
      console.log(`✅ [DEPOSIT] Correo de depósito enviado a: ${destData.mail}`);
    }
    
  } catch (error) {
    console.error('❌ [DEPOSIT] Error al enviar correo:', error);
    throw error;
  }
}

// ==================== GENERAR PDF DE TRANSFERENCIA ====================
const generateTransferPDF = async (req, res) => {
  try {
    const { tranId } = req.params;
    
    console.log(`📄 [PDF] Solicitud de PDF para tranId: ${tranId}`);
    
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
        console.error('❌ [PDF] Error en query:', err);
        return res.status(500).json({ success: false, msg: 'Error al obtener datos' });
      }
      
      if (!results || results.length === 0) {
        console.error('❌ [PDF] Transferencia no encontrada');
        return res.status(404).json({ success: false, msg: 'Transferencia no encontrada' });
      }
      
      const transfer = results[0];
      console.log('📄 [PDF] Datos de transferencia:', transfer);
      
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
        
        console.log('✅ [PDF] PDF generado exitosamente');
        
        // Enviar PDF como descarga
        const filename = `Comprobante_Transferencia_${String(tranId).padStart(10, '0')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
        
      } catch (pdfError) {
        console.error('❌ [PDF] Error al generar PDF:', pdfError);
        return res.status(500).json({ success: false, msg: 'Error al generar PDF' });
      }
    });
    
  } catch (error) {
    console.error('❌ [PDF] Error general:', error);
    return res.status(500).json({ success: false, msg: 'Error interno del servidor' });
  }
};

// ==================== GENERAR PDF DE DEPÓSITO ====================
const generateDepositPDF = async (req, res) => {
  try {
    const { depId } = req.params;
    
    console.log(`📄 [PDF] Solicitud de PDF para depId: ${depId}`);
    
    if (!depId) {
      return res.status(400).json({ success: false, msg: 'depId requerido' });
    }
    
    // Obtener datos del depósito
    const query = `
      SELECT 
        depId, mainId, accNum, amount, description, depositDate
      FROM deposito
      WHERE depId = ?
    `;
    
    db.query(query, [depId], async (err, results) => {
      if (err) {
        console.error('❌ [PDF] Error en query:', err);
        return res.status(500).json({ success: false, msg: 'Error al obtener datos' });
      }
      
      if (!results || results.length === 0) {
        console.error('❌ [PDF] Depósito no encontrado');
        return res.status(404).json({ success: false, msg: 'Depósito no encontrado' });
      }
      
      const deposit = results[0];
      console.log('📄 [PDF] Datos de depósito:', deposit);
      
      // Obtener saldo actual
      const accountQuery = `SELECT balance FROM cAccount WHERE accNum = ?`;
      db.query(accountQuery, [deposit.accNum], async (accErr, accResults) => {
        if (accErr) {
          console.error('❌ [PDF] Error al obtener saldo:', accErr);
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
          description: deposit.description || 'Depósito en efectivo',
          newBalance: balance
        };
        
        try {
          // Generar PDF
          const pdfService = require('../services/pdfService');
          const pdfBuffer = await pdfService.generateDepositPDF(pdfData);
          
          console.log('✅ [PDF] PDF generado exitosamente');
          
          // Enviar PDF como descarga
          const filename = `Comprobante_Deposito_${String(depId).padStart(10, '0')}.pdf`;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(pdfBuffer);
          
        } catch (pdfError) {
          console.error('❌ [PDF] Error al generar PDF:', pdfError);
          return res.status(500).json({ success: false, msg: 'Error al generar PDF' });
        }
      });
    });
    
  } catch (error) {
    console.error('❌ [PDF] Error general:', error);
    return res.status(500).json({ success: false, msg: 'Error interno del servidor' });
  }
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
  resetPassword
};
