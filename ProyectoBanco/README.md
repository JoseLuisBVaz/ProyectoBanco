# Banco JETY

Sistema bancario completo con gestión integral de cuentas, transferencias, créditos y operaciones financieras.

## Tabla de Contenidos

- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Frontend](#frontend)
- [Backend](#backend)
- [Base de Datos](#base-de-datos)
- [Instalación](#instalación)

---

## Arquitectura del Sistema

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | Angular | 18.x |
| **Backend** | Node.js + Express | Latest |
| **Base de Datos** | MySQL | 8.x |
| **Generación PDF** | PDFKit | Latest |
| **Email** | Nodemailer | Latest |

### Estructura de Directorios

```
ProyectoBanco/
├── src/
│   ├── app/
│   │   ├── cancelacion/
│   │   ├── credito/
│   │   ├── depositos/
│   │   ├── estado-cuenta/
│   │   ├── formulario/
│   │   ├── formulario-contrasena/
│   │   ├── guards/
│   │   ├── home/
│   │   ├── login/
│   │   ├── main/
│   │   ├── navbar/
│   │   ├── novedades/
│   │   ├── prestamos/
│   │   ├── progreso/
│   │   ├── register/
│   │   ├── register-emp/
│   │   ├── retiro/
│   │   ├── services/
│   │   ├── transfers/
│   │   └── user/
│   ├── backend/
│   │   ├── controller/
│   │   ├── routes/
│   │   ├── services/
│   │   └── config/
│   ├── database.sql
│   └── assets/
```

---

## Frontend

### Tecnología

Angular 18 con componentes standalone, TypeScript y CSS3.

### Características

- Componentes standalone sin NgModules
- Guards de autenticación y autorización por roles
- Formularios reactivos con validación
- Comunicación HTTP asíncrona
- Diseño responsivo

### Componentes

#### Autenticación
- **login**: Inicio de sesión
- **register**: Registro de clientes
- **register-emp**: Registro de empleados
- **formulario-contrasena**: Recuperación de contraseña con código de verificación

#### Panel Principal
- **home**: Dashboard con resumen de cuentas y modal promocional de crédito
- **navbar**: Navegación superior con menú de usuario
- **main**: Página de bienvenida
- **progreso**: Página de funcionalidades en desarrollo

#### Operaciones Bancarias
- **transfers**: Transferencias entre cuentas con selector visual de cuentas
- **depositos**: Registro de depósitos con selector visual de cuentas
- **retiro**: Retiros con generación de código y selector visual de cuentas
- **estado-cuenta**: Historial de movimientos con exportación PDF y envío por email

#### Gestión de Crédito
- **credito**: Visualización de línea de crédito con selector visual de cuentas
- **prestamos**: Solicitud de disposición de crédito
- **cancelacion**: Cancelación de cuentas

#### Información
- **user**: Perfil y datos personales
- **novedades**: Portal para empleados con accesos a funcionalidades administrativas
- **formulario**: Creación de cuentas bancarias (empleados)

### Sistema de Rutas

```typescript
const routes: Routes = [
  { path: '', component: Main },
  { path: 'login', component: LogIn },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'transferencia', component: Transfers, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'deposito', component: Depositos, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'retiro', component: Retiro, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'credito', component: Credito, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'cuenta', component: EstadoCuenta, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'usuario', component: DetallesCuenta, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'progreso', component: Progreso, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'formulario', component: Formulario, canActivate: [AuthGuard, RoleGuard], data: { roles: ['e','m'] } },
  { path: 'novedades', component: Novedades, canActivate: [AuthGuard, RoleGuard], data: { roles: ['e','m'] } },
  { path: 'cancelacion', component: Cancelacion, canActivate: [AuthGuard, RoleGuard], data: { roles: ['e','m'] } },
  { path: 'prestamo', component: Prestamo },
  { path: 'formulario-contrasena', component: FormularioContrasena }
];
```

### Guards de Seguridad

- **AuthGuard**: Verifica autenticación del usuario
- **RoleGuard**: Controla acceso por roles (c: cliente, e: empleado, m: manager)
- **LoginBlockGuard**: Previene acceso al login si ya autenticado

### Servicios

#### LoginService
```typescript
- login(mail, password): Observable<LoginResponse>
- logout(): void
- isAuthenticated(): boolean
- getCurrentUser(): User
- getCurrentUserProfile(): Observable<User>
```

#### UsuariosService
```typescript
- getAccountsByUser(mainId): Observable<Account[]>
- getUserInfo(mainId): Observable<UserInfo>
- createAccount(data): Observable<Response>
- deposit(data): Observable<Response>
- withdraw(data): Observable<Response>
- getRetirosRecientes(mainId): Observable<Withdrawal[]>
```

#### TransferService
```typescript
- transferFunds(data): Observable<TransferResponse>
- getTransfersByAccount(accountId): Observable<Transfer[]>
```

### Características UX

- **Selector Visual de Cuentas**: Tarjetas clickeables con animaciones
- **Gradientes Dinámicos**: Colores únicos por cuenta basados en hash
- **Modal Promocional**: Popup de oferta de crédito cada 75 segundos
- **Validación en Tiempo Real**: Feedback instantáneo
- **Máscaras de Datos**: Protección de información sensible
- **Exportación PDF**: Generación de estados de cuenta
- **Envío por Email**: Sistema de notificaciones y estados de cuenta

---

## Backend

### Tecnología

Node.js con Express siguiendo arquitectura MVC.

### Estructura

```
backend/
├── server.js
├── db.js
├── controller/
│   └── usuariosCtrl.js
├── routes/
│   └── usuarios.js
├── services/
│   ├── emailService.js
│   ├── emailTemplates.js
│   ├── pdfService.js
│   └── passwordResetService.js
└── config/
    └── email.config.js
```

### API Endpoints

#### Autenticación
```
POST /api/usuarios/login
POST /api/usuarios/register
POST /api/usuarios/register-employee
POST /api/usuarios/request-password-reset
POST /api/usuarios/verify-reset-code
POST /api/usuarios/reset-password
```

#### Cuentas
```
GET  /api/usuarios/accounts/:mainId
POST /api/usuarios/create-account
GET  /api/usuarios/account-details/:accountId
```

#### Transferencias
```
POST /api/usuarios/transfer
GET  /api/usuarios/transfer-history/:accountId
```

#### Depósitos y Retiros
```
POST /api/usuarios/deposit
POST /api/usuarios/withdraw
GET  /api/usuarios/movements/:mainId
```

#### Crédito
```
GET  /api/usuarios/credit-info/:mainId
POST /api/usuarios/dispose-credit
GET  /api/usuarios/credit-history/:accountId
```

#### Reportes
```
POST /api/usuarios/send-account-statement
```

### Servicios Principales

#### 1. Email Service (emailService.js)

Gestiona el envío de correos electrónicos utilizando Nodemailer con configuración SMTP.

**Funciones:**
- `sendWelcomeEmail(to, userData)`: Email de bienvenida
- `sendTransferNotification(to, transferData)`: Notificación de transferencia
- `sendAccountStatementEmail(to, userData, pdfBuffer)`: Estado de cuenta con PDF adjunto
- `sendPasswordResetEmail(to, resetData)`: Recuperación de contraseña

**Configuración SMTP:**
```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}
```

#### 2. PDF Service (pdfService.js)

Genera documentos PDF profesionales usando PDFKit.

**Funciones:**
- `generateAccountStatementPDF(accountData, movements)`: Estado de cuenta completo
  - Header con información de cuenta
  - Tabla de movimientos (últimos 30)
  - Cálculo de saldo corrido
  - Footer con branding del banco

**Características:**
- Formato profesional con colores corporativos
- Tablas con formato alternado
- Manejo de múltiples páginas
- Totales y subtotales automáticos

#### 3. Controller (usuariosCtrl.js)

Contiene toda la lógica de negocio. Principales endpoints:

**login**
```javascript
- Valida credenciales
- Verifica existencia en tabla main
- Busca datos en customer o employee
- Retorna información completa del usuario
```

**createAccount**
```javascript
- Genera número de cuenta aleatorio
- Crea CLABE interbancaria
- Genera número de tarjeta
- Inserta en tabla cAccount
```

**transferFunds**
```javascript
- Valida cuentas origen y destino
- Verifica saldo disponible
- Calcula comisiones
- Llama al SP sp_transfer_funds
- Registra en tabla transfer
```

**sendAccountStatementByEmail**
```javascript
- Obtiene información de cuenta
- Consulta movimientos (transfers, depositos, retiros)
- Genera PDF con pdfService
- Envía email con PDF adjunto
```

**getCreditInfo**
```javascript
- Llama a fn_calculate_credit_limit
- Calcula crédito disponible
- Calcula crédito utilizado
- Retorna información completa
```

**disposeCredit**
```javascript
- Valida tipo de cuenta (solo crédito)
- Verifica límite disponible
- Llama al SP sp_dispose_credit
- Actualiza balance
- Registra en creditDisposal
```

### Manejo de Errores

```javascript
try {
  // Operación
} catch (error) {
  console.error('[ERROR_TAG]', error);
  res.status(500).json({
    success: false,
    message: 'Mensaje amigable',
    error: error.message
  });
}
```

### Validaciones

- Validación de parámetros requeridos
- Validación de tipos de datos
- Validación de rangos (montos positivos)
- Validación de existencia de registros
- Validación de permisos y roles

---

## Base de Datos

### Tecnología

**MySQL 8.x** con uso extensivo de stored procedures y functions para lógica de negocio compleja.

### Esquema de Tablas

#### 1. main
Tabla principal de usuarios del sistema.

```sql
mainId INT PRIMARY KEY AUTO_INCREMENT
mail VARCHAR(100) NOT NULL
pass VARCHAR(100) NOT NULL
rol ENUM('c','e','m') NOT NULL  -- Cliente/Empleado/Manager
```

#### 2. customer
Información de clientes.

```sql
mainId INT PRIMARY KEY
phoneNumber VARCHAR(12)
firstName VARCHAR(100)
lastNameP VARCHAR(50)
lastNameM VARCHAR(50)
birthday DATE
address VARCHAR(250)
enterDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
curp VARCHAR(18)
rfc VARCHAR(13)
```

#### 3. employee
Información de empleados.

```sql
mainId INT PRIMARY KEY
phoneNumber VARCHAR(12)
firstName VARCHAR(100)
lastNameP VARCHAR(50)
lastNameM VARCHAR(50)
birthday DATE
address VARCHAR(250)
enterDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
curp VARCHAR(18)
rfc VARCHAR(13)
nss VARCHAR(11)  -- Número de Seguridad Social
```

#### 4. cAccount
Cuentas bancarias (débito y crédito).

```sql
accountId INT PRIMARY KEY AUTO_INCREMENT
mainId INT NOT NULL
cardNum VARCHAR(16) UNIQUE
balance DECIMAL(12,2) DEFAULT 0
clabe VARCHAR(18) UNIQUE
accNum VARCHAR(10) UNIQUE
accPhone VARCHAR(10)
accType ENUM('Debito','Credito')
```

#### 5. transfer
Registro de transferencias entre cuentas.

```sql
tranId INT PRIMARY KEY AUTO_INCREMENT
origin VARCHAR(30)
destiny VARCHAR(30)
ammount DECIMAL(12,2)
fee DECIMAL(12,2)
description VARCHAR(300)
doDate DATE
```

#### 6. deposito
Registro de depósitos a cuentas.

```sql
depId INT PRIMARY KEY AUTO_INCREMENT
mainId INT NOT NULL
accNum VARCHAR(10)
amount DECIMAL(12,2)
description VARCHAR(300)
depositDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 7. retiros
Registro de retiros de efectivo.

```sql
withdrawId INT PRIMARY KEY AUTO_INCREMENT
mainId INT NOT NULL
accNum VARCHAR(10)
amount DECIMAL(12,2)
description VARCHAR(300)
withdrawDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 8. creditDisposal
Registro de disposiciones de crédito.

```sql
disposalId INT PRIMARY KEY AUTO_INCREMENT
accountId INT NOT NULL
amount DECIMAL(12,2)
description VARCHAR(300)
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
availableAfter DECIMAL(12,2)
```

### Funciones SQL

#### fn_calculate_credit_limit(p_mainId INT)

Calcula el límite de crédito dinámico basado en el historial de depósitos del último mes.

**Lógica:**
1. Consulta depósitos del último mes
2. Calcula promedio mensual
3. Si hay menos de 1 mes de datos → límite mínimo $5,000
4. Límite = promedio mensual × 1
5. Redondea a miles

**Retorno:** `DECIMAL(12,2)` - Límite de crédito en pesos

**Ejemplo:**
```sql
SELECT fn_calculate_credit_limit(5) AS creditLimit;
-- Retorna: 15000.00 (si el promedio mensual es $15,000)
```

### Stored Procedures

#### sp_transfer_funds

Realiza transferencias entre cuentas con validaciones y cálculo de comisiones.

**Parámetros:**
```sql
IN p_origin VARCHAR(30)     -- Cuenta origen (accNum o CLABE)
IN p_destiny VARCHAR(30)    -- Cuenta destino (accNum o CLABE)
IN p_amount DECIMAL(12,2)   -- Monto a transferir
IN p_description VARCHAR(300) -- Descripción
```

**Proceso:**
1. Valida parámetros (no nulos, monto > 0)
2. Verifica que origen ≠ destino
3. Calcula comisión: `(monto/100)*5 + (monto/1500)*10`
4. Obtiene cuentas con lock (FOR UPDATE)
5. Verifica saldo suficiente
6. Actualiza balance de ambas cuentas
7. Registra en tabla transfer
8. Retorna tranId y fee

**Retorno:**
```sql
tranId INT    -- ID de la transferencia
fee DECIMAL   -- Comisión cobrada
```

#### sp_dispose_credit

Realiza disposiciones de crédito verificando límite disponible.

**Parámetros:**
```sql
IN p_accountId INT          -- ID de cuenta de crédito
IN p_amount DECIMAL(12,2)   -- Monto a disponer
IN p_description VARCHAR(300) -- Descripción
```

**Proceso:**
1. Verifica que la cuenta sea tipo 'Credito'
2. Calcula límite con fn_calculate_credit_limit
3. Calcula disponible: `límite + balance`
4. Verifica que monto ≤ disponible
5. Actualiza balance (resta el monto)
6. Registra en creditDisposal
7. Retorna información de disposición

**Retorno:**
```sql
disposalId INT         -- ID de la disposición
availableAfter DECIMAL -- Crédito disponible después
creditLimit DECIMAL    -- Límite total
usedCredit DECIMAL     -- Crédito utilizado
message VARCHAR        -- Mensaje de confirmación
```

### Índices y Optimización

```sql
-- Índices para mejorar rendimiento
INDEX idx_caccount_mainId (mainId)
INDEX idx_retiros_mainId (mainId)
INDEX idx_retiros_date (withdrawDate)
INDEX idx_creditdisposal_accountId (accountId)
INDEX idx_creditdisposal_date (timestamp)

-- Constraints
UNIQUE KEY uq_caccount_cardNum (cardNum)
UNIQUE KEY uq_caccount_clabe (clabe)
UNIQUE KEY uq_caccount_accnum (accNum)
```

### Relaciones

```
main (1) ──→ (N) customer
main (1) ──→ (N) employee
main (1) ──→ (N) cAccount
cAccount (1) ──→ (N) creditDisposal
cAccount (1) ──→ (N) transfer
cAccount (1) ──→ (N) deposito
cAccount (1) ──→ (N) retiros
```

### Triggers y Cascade

- **ON DELETE CASCADE**: Al eliminar un usuario, se eliminan todas sus cuentas y registros
- **ON UPDATE CASCADE**: Al actualizar mainId, se propagan cambios

---

## Instalación

### Prerrequisitos

- Node.js 18+ y npm
- Angular CLI 18+
- MySQL 8+
- Git

### 1. Clonar Repositorio

```bash
git clone https://github.com/JoseLuisBVaz/ProyectoBanco.git
cd ProyectoBanco/ProyectoBanco
```

### 2. Instalar Dependencias

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd src/backend
npm install
cd ../..
```

### 3. Configurar Base de Datos

```bash
mysql -u root -p
```

Ejecutar el script completo:
```sql
SOURCE src/database.sql;
```

### 4. Configurar Variables de Entorno

Crear archivo `src/backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=Banco_Jety
DB_PORT=3306

EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password

PORT=3000
```

### 5. Iniciar Aplicación

**Terminal 1 - Backend:**
```bash
cd src/backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
ng serve
```

### 6. Acceder a la Aplicación

Abrir navegador en: `http://localhost:4200`

---