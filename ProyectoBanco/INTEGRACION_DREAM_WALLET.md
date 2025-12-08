# 🏦 Guía de Integración Interbancaria - Dream Wallet

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura de Integración](#arquitectura-de-integración)
3. [Autenticación y Seguridad](#autenticación-y-seguridad)
4. [Implementación del API](#implementación-del-api)
5. [Manejo de Errores](#manejo-de-errores)
6. [Mapeo de Campos](#mapeo-de-campos)
7. [Código de Ejemplo](#código-de-ejemplo)
8. [Pruebas y Validación](#pruebas-y-validación)

---

## 📌 Resumen Ejecutivo

Este documento describe la implementación necesaria en **Dream Wallet** para recibir transferencias interbancarias desde **Banco JETY**. La integración utiliza APIs REST con autenticación por API Keys y maneja transacciones con rollback para garantizar la consistencia de datos.

### Características Clave:
- ✅ **Sin modificaciones de base de datos**: Usa transacciones nativas de MySQL
- ✅ **Adaptación de campos**: Cada banco mapea los campos recibidos a su propia estructura
- ✅ **Valores por defecto**: Manejo automático de campos faltantes
- ✅ **Rollback automático**: Si algo falla, se revierten todos los cambios
- ✅ **Comunicación bidireccional**: Ambos bancos pueden enviar y recibir transferencias

---

## 🏗️ Arquitectura de Integración

### Flujo de Transferencia: Banco JETY → Dream Wallet

```
┌─────────────────┐         ┌─────────────────┐
│   Banco JETY    │         │  Dream Wallet   │
│   (Origen)      │         │   (Destino)     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ 1. POST /api/interbank/   │
         │    recibir                │
         │ Header: x-api-key         │
         ├──────────────────────────>│
         │                           │
         │                  2. Validar API Key
         │                           │
         │                  3. Iniciar Transacción
         │                           │
         │                  4. Buscar cuenta destino
         │                           │
         │                  5. Actualizar saldo
         │                           │
         │                  6. Registrar transferencia
         │                           │
         │ 7. Respuesta SUCCESS      │
         │<──────────────────────────┤
         │    { tranId, msg }        │
         │                           │
```

### Componentes Necesarios:

1. **Middleware de Autenticación** (`middleware/apiKeyAuth.js`)
2. **Configuración de Bancos** (`config/bancos-autorizados.js`)
3. **Controlador de Transferencias** (`controller/interbancarioCtrl.js`)
4. **Rutas del API** (`routes/interbancaria.js`)
5. **Cliente HTTP** (`services/bancoJetyAPI.js`) - para enviar transferencias a Banco JETY

---

## 🔐 Autenticación y Seguridad

### API Keys

Cada banco tiene una API Key única para autenticarse:

| Banco | API Key | Uso |
|-------|---------|-----|
| Banco JETY | `jety_api_key_abc123` | Dream Wallet valida esta key cuando Banco JETY envía transferencias |
| Dream Wallet | `dream_wallet_key_xyz789` | Banco JETY valida esta key cuando Dream Wallet envía transferencias |

### Variables de Entorno Requeridas

Agregar al archivo `.env` de Dream Wallet:

```env
# ==================== INTEGRACIÓN INTERBANCARIA ====================
# URL del API de Banco JETY para enviar transferencias
BANCO_JETY_API_URL=http://18.116.122.121:3000/api/interbancaria/transferencia-entrante

# API Key de Dream Wallet para autenticarse con Banco JETY
BANCO_JETY_API_KEY=dream_wallet_key_xyz789

# API Key de Banco JETY para validar llamadas entrantes
JETY_AUTHORIZED_KEY=jety_api_key_abc123
```

### Endpoints de Integración

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/interbank/recibir` | POST | Recibir transferencias desde Banco JETY |
| `/api/interbank/enviar` | POST | Enviar transferencias a Banco JETY |

---

## 🛠️ Implementación del API

### 1. Middleware de Autenticación

**Archivo**: `middleware/apiKeyAuth.js`

```javascript
const bancosAutorizados = require('../config/bancos-autorizados');

/**
 * Middleware para validar API Keys de bancos autorizados
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      msg: 'API Key no proporcionada. Use el header x-api-key'
    });
  }

  // Buscar el banco por API Key
  const banco = bancosAutorizados[apiKey];

  if (!banco) {
    return res.status(403).json({
      success: false,
      msg: 'API Key inválida o no autorizada'
    });
  }

  if (!banco.active) {
    return res.status(403).json({
      success: false,
      msg: `El banco ${banco.name} está desactivado`
    });
  }

  // Agregar información del banco al request
  req.bankInfo = banco;
  next();
}

module.exports = apiKeyAuth;
```

---

### 2. Configuración de Bancos Autorizados

**Archivo**: `config/bancos-autorizados.js`

```javascript
/**
 * Lista de bancos autorizados para realizar transferencias interbancarias
 * Mapea API Keys a información del banco
 */
const bancosAutorizados = {
  // API Key de Banco JETY
  'jety_api_key_abc123': {
    name: 'Banco JETY',
    url: 'http://18.116.122.121:3000/api/interbancaria/transferencia-entrante',
    active: true,
    created: '2025-01-15'
  }
  // Aquí se pueden agregar más bancos en el futuro
};

module.exports = bancosAutorizados;
```

---

### 3. Controlador de Transferencias

**Archivo**: `controller/interbancarioCtrl.js`

```javascript
const db = require('../db');

/**
 * Recibir transferencia desde otro banco (Banco JETY → Dream Wallet)
 */
const recibirTransferencia = async (req, res) => {
  const {
    cuentaOrigen,
    cuentaDestino,
    monto,
    concepto,
    bancoOrigen,
    referencia
  } = req.body;

  // Validaciones básicas
  if (!cuentaDestino || !monto) {
    return res.status(400).json({
      success: false,
      msg: 'Los campos cuentaDestino y monto son obligatorios'
    });
  }

  const numericMonto = parseFloat(monto);
  if (isNaN(numericMonto) || numericMonto <= 0) {
    return res.status(400).json({
      success: false,
      msg: 'El monto debe ser un número mayor a 0'
    });
  }

  let connection;

  try {
    // Obtener conexión para transacción
    connection = await new Promise((resolve, reject) => {
      db.getConnection((err, conn) => {
        if (err) return reject(err);
        resolve(conn);
      });
    });

    // Iniciar transacción
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 1. Buscar la cuenta destino en Dream Wallet
    // IMPORTANTE: Adaptar esta consulta a tu estructura de base de datos
    // Aquí se busca por número de cuenta o CLABE
    const destinoAccount = await new Promise((resolve, reject) => {
      const query = `
        SELECT id, balance, numero_cuenta, clabe 
        FROM cuentas 
        WHERE numero_cuenta = ? OR clabe = ?
      `;
      connection.query(query, [cuentaDestino, cuentaDestino], (err, results) => {
        if (err) return reject(err);
        if (!results || results.length === 0) {
          return reject(new Error('Cuenta destino no encontrada'));
        }
        resolve(results[0]);
      });
    });

    // 2. Actualizar el saldo de la cuenta destino (SUMAR el monto)
    await new Promise((resolve, reject) => {
      const updateQuery = `
        UPDATE cuentas 
        SET balance = balance + ? 
        WHERE numero_cuenta = ? OR clabe = ?
      `;
      connection.query(updateQuery, [numericMonto, cuentaDestino, cuentaDestino], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return reject(new Error('No se pudo actualizar el saldo de la cuenta destino'));
        }
        resolve();
      });
    });

    // 3. Registrar la transferencia en la tabla de transacciones
    // IMPORTANTE: Adaptar esta consulta a tu estructura de base de datos
    // Usar valores por defecto para campos que Banco JETY no envíe
    const tranId = await new Promise((resolve, reject) => {
      const insertQuery = `
        INSERT INTO transferencias 
        (cuenta_origen, banco_origen, cuenta_destino, banco_destino, monto, concepto, referencia, fecha)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      // Valores por defecto si no vienen en el request
      const cuentaOrigenFinal = cuentaOrigen || 'EXTERNA';
      const bancoOrigenFinal = bancoOrigen || 'Banco JETY';
      const conceptoFinal = concepto || 'Transferencia interbancaria entrante';
      const referenciaFinal = referencia || `EXT-${Date.now()}`;

      connection.query(
        insertQuery,
        [cuentaOrigenFinal, bancoOrigenFinal, cuentaDestino, 'Dream Wallet', numericMonto, conceptoFinal, referenciaFinal],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.insertId);
        }
      );
    });

    // 4. Commit de la transacción
    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) return reject(err);
        connection.release();
        resolve();
      });
    });

    // 5. Respuesta exitosa
    return res.json({
      success: true,
      tranId: tranId,
      msg: 'Transferencia recibida exitosamente',
      cuentaDestino: destinoAccount.numero_cuenta,
      monto: numericMonto,
      nuevoSaldo: destinoAccount.balance + numericMonto
    });

  } catch (error) {
    // Rollback en caso de error
    if (connection) {
      await new Promise((resolve) => {
        connection.rollback(() => {
          connection.release();
          resolve();
        });
      });
    }

    console.error('❌ [INTERBANK] Error al recibir transferencia:', error);
    return res.status(500).json({
      success: false,
      msg: error.message || 'Error al procesar la transferencia entrante'
    });
  }
};

/**
 * Enviar transferencia a otro banco (Dream Wallet → Banco JETY)
 * Este endpoint se usará cuando Dream Wallet quiera enviar dinero a Banco JETY
 */
const enviarTransferencia = async (req, res) => {
  // Implementar lógica similar pero al revés:
  // 1. Validar cuenta origen en Dream Wallet
  // 2. Descontar saldo + comisión
  // 3. Llamar al API de Banco JETY
  // 4. Registrar la transferencia
  // 5. Commit o rollback según respuesta del otro banco
  
  return res.status(501).json({
    success: false,
    msg: 'Endpoint de envío a implementar según necesidades de Dream Wallet'
  });
};

module.exports = {
  recibirTransferencia,
  enviarTransferencia
};
```

---

### 4. Rutas del API

**Archivo**: `routes/interbancaria.js`

```javascript
const express = require('express');
const router = express.Router();
const interbancarioCtrl = require('../controller/interbancarioCtrl');
const apiKeyAuth = require('../middleware/apiKeyAuth');

/**
 * POST /api/interbank/recibir
 * Recibir transferencia desde Banco JETY
 * Requiere API Key en header: x-api-key
 */
router.post('/recibir', apiKeyAuth, interbancarioCtrl.recibirTransferencia);

/**
 * POST /api/interbank/enviar
 * Enviar transferencia a Banco JETY
 * Requiere API Key en header: x-api-key
 */
router.post('/enviar', apiKeyAuth, interbancarioCtrl.enviarTransferencia);

module.exports = router;
```

---

### 5. Registrar Rutas en el Servidor

**Archivo**: `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const interbancaria = require('./routes/interbancaria');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas existentes...
// app.use('/api/usuarios', usuariosRoutes);

// ⬇️ AGREGAR ESTA LÍNEA
app.use('/api/interbank', interbancaria);

// Resto del servidor...
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
```

---

### 6. Cliente HTTP para Enviar a Banco JETY (Opcional)

**Archivo**: `services/bancoJetyAPI.js`

```javascript
const axios = require('axios');
require('dotenv').config();

class BancoJetyAPI {
  /**
   * Enviar transferencia a Banco JETY
   */
  static async enviarTransferencia(datos) {
    const {
      cuentaOrigen,
      cuentaDestino,
      monto,
      concepto,
      bancoOrigen,
      referencia
    } = datos;

    const url = process.env.BANCO_JETY_API_URL;
    const apiKey = process.env.BANCO_JETY_API_KEY;

    if (!url || !apiKey) {
      return {
        success: false,
        error: 'URL o API Key de Banco JETY no configuradas'
      };
    }

    try {
      const response = await axios.post(
        url,
        {
          cuentaOrigen: cuentaOrigen || 'EXTERNA',
          cuentaDestino,
          monto,
          concepto: concepto || 'Transferencia desde Dream Wallet',
          bancoOrigen: bancoOrigen || 'Dream Wallet',
          referencia: referencia || `DW-${Date.now()}`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          timeout: 10000 // 10 segundos
        }
      );

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('❌ [BANCO_JETY_API] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.msg || error.message
      };
    }
  }
}

module.exports = BancoJetyAPI;
```

---

## ⚠️ Manejo de Errores

### Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| `200` | ✅ Transferencia exitosa |
| `400` | ❌ Error en validación de datos (campos faltantes, monto inválido) |
| `401` | 🔒 API Key no proporcionada |
| `403` | 🚫 API Key inválida o banco desactivado |
| `500` | ⚡ Error interno del servidor (problema de BD, timeout, etc.) |

### Formato de Respuestas de Error

```json
{
  "success": false,
  "msg": "Descripción del error",
  "error": "Detalle técnico adicional (opcional)"
}
```

### Ejemplo de Respuestas

**Éxito:**
```json
{
  "success": true,
  "tranId": 12345,
  "msg": "Transferencia recibida exitosamente",
  "cuentaDestino": "1234567890",
  "monto": 1000.50,
  "nuevoSaldo": 5500.75
}
```

**Error - Cuenta no encontrada:**
```json
{
  "success": false,
  "msg": "Cuenta destino no encontrada"
}
```

**Error - API Key inválida:**
```json
{
  "success": false,
  "msg": "API Key inválida o no autorizada"
}
```

---

## 🗺️ Mapeo de Campos

### Campos Enviados por Banco JETY

| Campo Banco JETY | Campo Dream Wallet | Valor por Defecto | Descripción |
|------------------|-------------------|-------------------|-------------|
| `cuentaOrigen` | `cuenta_origen` | `'EXTERNA'` | Número de cuenta o CLABE origen |
| `cuentaDestino` | `cuenta_destino` | *(requerido)* | Número de cuenta o CLABE destino |
| `monto` | `monto` | *(requerido)* | Monto de la transferencia |
| `concepto` | `concepto` | `'Transferencia interbancaria entrante'` | Descripción de la transferencia |
| `bancoOrigen` | `banco_origen` | `'Banco JETY'` | Nombre del banco origen |
| `referencia` | `referencia` | `'EXT-{timestamp}'` | Referencia única de la operación |

### Adaptación a tu Base de Datos

**IMPORTANTE**: Debes adaptar las consultas SQL a tu estructura de base de datos. Ejemplo:

#### Si tu tabla de cuentas se llama `accounts`:
```javascript
const query = `
  SELECT id, balance, account_number 
  FROM accounts 
  WHERE account_number = ? OR clabe = ?
`;
```

#### Si tu tabla de transferencias se llama `transactions`:
```javascript
const insertQuery = `
  INSERT INTO transactions 
  (origin, destination, amount, description, date)
  VALUES (?, ?, ?, ?, NOW())
`;
```

#### Si no tienes campo CLABE:
```javascript
const query = `
  SELECT id, balance, account_number 
  FROM accounts 
  WHERE account_number = ?
`;
connection.query(query, [cuentaDestino], ...);
```

---

## 💻 Código de Ejemplo Completo

### Ejemplo de Request desde Banco JETY a Dream Wallet

```bash
curl -X POST http://3.130.29.73:3000/api/interbank/recibir \
  -H "Content-Type: application/json" \
  -H "x-api-key: jety_api_key_abc123" \
  -d '{
    "cuentaOrigen": "1234567890",
    "cuentaDestino": "0987654321",
    "monto": 1500.00,
    "concepto": "Pago de servicios",
    "bancoOrigen": "Banco JETY",
    "referencia": "JETY-12345"
  }'
```

### Ejemplo de Respuesta Exitosa

```json
{
  "success": true,
  "tranId": 67890,
  "msg": "Transferencia recibida exitosamente",
  "cuentaDestino": "0987654321",
  "monto": 1500,
  "nuevoSaldo": 8500.50
}
```

---

## 🧪 Pruebas y Validación

### Checklist de Implementación

- [ ] Crear archivo `middleware/apiKeyAuth.js`
- [ ] Crear archivo `config/bancos-autorizados.js`
- [ ] Crear archivo `controller/interbancarioCtrl.js`
- [ ] Crear archivo `routes/interbancaria.js`
- [ ] Agregar rutas en `server.js`
- [ ] Agregar variables de entorno en `.env`
- [ ] Adaptar consultas SQL a tu estructura de BD
- [ ] Instalar dependencia `axios` si no está: `npm install axios`
- [ ] Probar endpoint con Postman o curl
- [ ] Verificar que las transacciones se registren correctamente
- [ ] Verificar que el rollback funcione en caso de error

### Escenarios de Prueba

1. **Transferencia Exitosa**: Cuenta válida, saldo suficiente, API Key correcta
2. **Cuenta Inexistente**: cuentaDestino que no existe en la BD
3. **API Key Inválida**: Usar una API Key incorrecta
4. **API Key Faltante**: No enviar el header `x-api-key`
5. **Monto Inválido**: Enviar monto negativo, cero, o texto
6. **Campos Faltantes**: No enviar `cuentaDestino` o `monto`
7. **Timeout**: Simular respuesta lenta del servidor

### Ejemplo de Prueba con Postman

1. **URL**: `POST http://3.130.29.73:3000/api/interbank/recibir`
2. **Headers**:
   - `Content-Type: application/json`
   - `x-api-key: jety_api_key_abc123`
3. **Body** (JSON):
```json
{
  "cuentaOrigen": "1234567890",
  "cuentaDestino": "0987654321",
  "monto": 500.00,
  "concepto": "Prueba de integración",
  "bancoOrigen": "Banco JETY",
  "referencia": "TEST-001"
}
```

---

## 📝 Notas Importantes

### 1. Seguridad
- ✅ **NUNCA** subir las API Keys al repositorio Git
- ✅ Usar variables de entorno (`.env`) para datos sensibles
- ✅ Agregar `.env` al `.gitignore`
- ✅ Validar siempre la API Key antes de procesar transferencias
- ✅ Usar HTTPS en producción (no HTTP)

### 2. Consistencia de Datos
- ✅ **SIEMPRE** usar transacciones de MySQL
- ✅ Hacer rollback si cualquier paso falla
- ✅ Validar saldos antes de actualizar
- ✅ Registrar todas las operaciones en la tabla de transferencias

### 3. Valores por Defecto
- ✅ Si `cuentaOrigen` no viene, usar `'EXTERNA'`
- ✅ Si `bancoOrigen` no viene, usar `'Banco JETY'`
- ✅ Si `concepto` no viene, usar `'Transferencia interbancaria entrante'`
- ✅ Si `referencia` no viene, generar una: `'EXT-{timestamp}'`

### 4. Adaptación a tu Sistema
- ⚠️ Cambiar nombres de tablas según tu BD (`cuentas`, `transferencias`, etc.)
- ⚠️ Cambiar nombres de campos según tu BD (`balance`, `numero_cuenta`, etc.)
- ⚠️ Ajustar las consultas SQL a tu estructura específica
- ⚠️ Mantener la lógica de transacciones y rollback

---

## 📞 Contacto de Soporte

Para dudas o problemas con la integración, contactar a:

- **Banco JETY**: 18.116.122.121:3000
- **Dream Wallet**: 3.130.29.73:3000

---

## 📄 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-01-15 | Versión inicial de la documentación |

---

## ✅ Resumen de Archivos a Crear

```
src/
└── backend/
    ├── middleware/
    │   └── apiKeyAuth.js          ← Validar API Keys
    ├── config/
    │   └── bancos-autorizados.js  ← Lista de bancos autorizados
    ├── controller/
    │   └── interbancarioCtrl.js   ← Lógica de transferencias
    ├── routes/
    │   └── interbancaria.js       ← Rutas del API
    ├── services/
    │   └── bancoJetyAPI.js        ← Cliente HTTP (opcional)
    ├── .env                       ← Variables de entorno
    └── server.js                  ← Registrar rutas (modificar)
```

---

## 🎯 Siguientes Pasos

1. Implementar los 5 archivos descritos en esta guía
2. Adaptar las consultas SQL a tu estructura de base de datos
3. Configurar las variables de entorno en `.env`
4. Probar el endpoint con Postman o curl
5. Coordinar pruebas con Banco JETY
6. Implementar el endpoint de envío (`enviar`) si es necesario

---

**¡Listo para integrar! 🚀**
