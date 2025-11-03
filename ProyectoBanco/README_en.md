# Banco JETY

Complete banking system developed with modern web technologies that enables comprehensive management of bank accounts, transfers, credits, and financial operations.

## Table of Contents

- [System Architecture](#system-architecture)
- [Frontend](#frontend)
- [Backend](#backend)
- [Database](#database)
- [Installation](#installation)

---

## System Architecture

### Overview

**Banco Jety** is a full-stack web application that simulates modern bank operations. The architecture is divided into three main layers:

### Technology Stack

| Layer | Technology | Version |
|------|-----------|---------|
| **Frontend** | Angular | 18.x |
| **Backend** | Node.js + Express | Latest |
| **Database** | MySQL | 8.x |
| **PDF Generation** | PDFKit | Latest |
| **Email** | Nodemailer | Latest |

### Directory Structure

```
ProyectoBanco/
├── src/
│   ├── app/                    # Angular Frontend
│   │   ├── components/         # Application components
│   │   ├── services/          # Shared services
│   │   ├── guards/            # Authentication guards
│   │   └── models/            # TypeScript interfaces
│   ├── backend/               # Node.js Backend
│   │   ├── controller/        # Business controllers
│   │   ├── routes/            # API routes
│   │   ├── services/          # Services (Email, PDF)
│   │   └── config/            # Configurations
│   ├── database.sql           # Database schema
│   └── assets/                # Static resources
```

---

## Frontend

### Technology

Built with **Angular 18** using standalone component architecture, leveraging TypeScript and CSS3 for a modern and responsive interface.

### Key Features

- **Standalone Components**: Modular architecture without NgModules
- **Advanced Routing**: Navigation system with authentication guards
- **Reactive Forms**: Reactive forms with validation
- **HTTP Client**: Asynchronous communication with backend
- **Responsive Design**: Adaptable to mobile and desktop devices

### Component Structure

#### 1. Authentication
- **login**: Login for customers and employees
- **register**: New customer registration
- **register-emp**: Employee registration (administrators only)

#### 2. Main Panel
- **home**: Main dashboard with account summary
- **navbar**: Top navigation bar with user menu
- **main**: Main application container

#### 3. Banking Operations
- **transfers**: Transfers between own or external accounts
- **depositos**: Account deposits
- **retiro**: Cash withdrawals
- **estado-cuenta**: Complete transaction history with email option

#### 4. Credit Management
- **credito**: Available credit line visualization
- **prestamos**: Credit disposal (loans)
- **cancelacion**: Account cancellation and settlement

#### 5. Information
- **user**: User profile and personal data
- **novedades**: Bank news and updates
- **formulario**: Contact and support forms
- **formulario-contrasena**: Password recovery

### Routing System

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [AuthGuard] },
  { path: 'transfers', component: Transfers, canActivate: [AuthGuard] },
  { path: 'credito', component: Credito, canActivate: [AuthGuard] },
  // ... more protected routes
];
```

### Security Guards

- **AuthGuard**: Protects routes requiring authentication
- **LoginBlockGuard**: Prevents login access when already authenticated
- **RoleGuard**: Controls access based on roles (customer/employee/manager)

### Services

#### LoginService
Manages authentication, sessions, and user tokens.

```typescript
- login(credentials): Observable<LoginResponse>
- logout(): void
- isAuthenticated(): boolean
- getCurrentUser(): User
```

#### UsuariosService
Handles all user and account-related operations.

```typescript
- getAccountsByUser(mainId): Observable<Account[]>
- getUserInfo(mainId): Observable<UserInfo>
- createAccount(data): Observable<Response>
```

#### TransferService
Manages transfers and financial operations.

```typescript
- transferFunds(data): Observable<TransferResponse>
- getTransferHistory(accountId): Observable<Transfer[]>
```

### UI/UX Features

- **Bank Card Design**: Visual cards with dynamic gradients
- **CSS Animations**: Smooth transitions and hover effects
- **Promotional Modal**: Popup system for credit offers
- **Notifications**: Alerts and visual feedback for operations
- **Data Masking**: Card and account number masking
- **Real-time Validation**: Instant feedback in forms

---

## Backend

### Technology

Built with **Node.js** using the **Express** framework, following MVC architecture and service patterns.

### Structure

```
backend/
├── server.js              # Entry point
├── db.js                  # MySQL connection configuration
├── controller/
│   └── usuariosCtrl.js   # Business logic
├── routes/
│   └── usuarios.js       # Route definitions
├── services/
│   ├── emailService.js   # Email sending
│   ├── emailTemplates.js # HTML templates
│   ├── pdfService.js     # PDF generation
│   └── passwordResetService.js
└── config/
    └── email.config.js   # SMTP configuration
```

### API Endpoints

#### Authentication
```
POST /api/usuarios/login
POST /api/usuarios/register
POST /api/usuarios/register-employee
```

#### Accounts
```
GET  /api/usuarios/accounts/:mainId
POST /api/usuarios/create-account
GET  /api/usuarios/account-details/:accountId
```

#### Transfers
```
POST /api/usuarios/transfer
GET  /api/usuarios/transfer-history/:accountId
```

#### Deposits and Withdrawals
```
POST /api/usuarios/deposit
POST /api/usuarios/withdraw
GET  /api/usuarios/movements/:mainId
```

#### Credit
```
GET  /api/usuarios/credit-info/:mainId
POST /api/usuarios/dispose-credit
GET  /api/usuarios/credit-history/:accountId
```

#### Reports
```
POST /api/usuarios/send-account-statement
```

### Core Services

#### 1. Email Service (emailService.js)

Manages email sending using Nodemailer with SMTP configuration.

**Functions:**
- `sendWelcomeEmail(to, userData)`: Welcome email
- `sendTransferNotification(to, transferData)`: Transfer notification
- `sendAccountStatementEmail(to, userData, pdfBuffer)`: Account statement with PDF attachment
- `sendPasswordResetEmail(to, resetData)`: Password recovery

**SMTP Configuration:**
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

Generates professional PDF documents using PDFKit.

**Functions:**
- `generateAccountStatementPDF(accountData, movements)`: Complete account statement
  - Header with account information
  - Transaction table (last 30)
  - Running balance calculation
  - Footer with bank branding

**Features:**
- Professional format with corporate colors
- Alternating table format
- Multi-page handling
- Automatic totals and subtotals

#### 3. Controller (usuariosCtrl.js)

Contains all business logic. Main endpoints:

**login**
```javascript
- Validates credentials
- Verifies existence in main table
- Searches data in customer or employee
- Returns complete user information
```

**createAccount**
```javascript
- Generates random account number
- Creates interbank CLABE
- Generates card number
- Inserts into cAccount table
```

**transferFunds**
```javascript
- Validates source and destination accounts
- Verifies available balance
- Calculates fees
- Calls sp_transfer_funds SP
- Records in transfer table
```

**sendAccountStatementByEmail**
```javascript
- Gets account information
- Queries movements (transfers, deposits, withdrawals)
- Generates PDF with pdfService
- Sends email with PDF attachment
```

**getCreditInfo**
```javascript
- Calls fn_calculate_credit_limit
- Calculates available credit
- Calculates used credit
- Returns complete information
```

**disposeCredit**
```javascript
- Validates account type (credit only)
- Verifies available limit
- Calls sp_dispose_credit SP
- Updates balance
- Records in creditDisposal
```

### Error Handling

```javascript
try {
  // Operation
} catch (error) {
  console.error('[ERROR_TAG]', error);
  res.status(500).json({
    success: false,
    message: 'Friendly message',
    error: error.message
  });
}
```

### Validations

- Required parameter validation
- Data type validation
- Range validation (positive amounts)
- Record existence validation
- Permission and role validation

---

## Database

### Technology

**MySQL 8.x** with extensive use of stored procedures and functions for complex business logic.

### Table Schema

#### 1. main
Main system user table.

```sql
mainId INT PRIMARY KEY AUTO_INCREMENT
mail VARCHAR(100) NOT NULL
pass VARCHAR(100) NOT NULL
rol ENUM('c','e','m') NOT NULL  -- Customer/Employee/Manager
```

#### 2. customer
Customer information.

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
Employee information.

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
nss VARCHAR(11)  -- Social Security Number
```

#### 4. cAccount
Bank accounts (debit and credit).

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
Transfer records between accounts.

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
Account deposit records.

```sql
depId INT PRIMARY KEY AUTO_INCREMENT
mainId INT NOT NULL
accNum VARCHAR(10)
amount DECIMAL(12,2)
description VARCHAR(300)
depositDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 7. retiros
Cash withdrawal records.

```sql
withdrawId INT PRIMARY KEY AUTO_INCREMENT
mainId INT NOT NULL
accNum VARCHAR(10)
amount DECIMAL(12,2)
description VARCHAR(300)
withdrawDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 8. creditDisposal
Credit disposal records.

```sql
disposalId INT PRIMARY KEY AUTO_INCREMENT
accountId INT NOT NULL
amount DECIMAL(12,2)
description VARCHAR(300)
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
availableAfter DECIMAL(12,2)
```

### SQL Functions

#### fn_calculate_credit_limit(p_mainId INT)

Calculates dynamic credit limit based on last month's deposit history.

**Logic:**
1. Queries last month's deposits
2. Calculates monthly average
3. If less than 1 month of data → minimum limit $5,000
4. Limit = monthly average × 1
5. Rounds to thousands

**Returns:** `DECIMAL(12,2)` - Credit limit in pesos

**Example:**
```sql
SELECT fn_calculate_credit_limit(5) AS creditLimit;
-- Returns: 15000.00 (if monthly average is $15,000)
```

### Stored Procedures

#### sp_transfer_funds

Performs transfers between accounts with validations and fee calculation.

**Parameters:**
```sql
IN p_origin VARCHAR(30)     -- Source account (accNum or CLABE)
IN p_destiny VARCHAR(30)    -- Destination account (accNum or CLABE)
IN p_amount DECIMAL(12,2)   -- Amount to transfer
IN p_description VARCHAR(300) -- Description
```

**Process:**
1. Validates parameters (not null, amount > 0)
2. Verifies source ≠ destination
3. Calculates fee: `(amount/100)*5 + (amount/1500)*10`
4. Gets accounts with lock (FOR UPDATE)
5. Verifies sufficient balance
6. Updates balance of both accounts
7. Records in transfer table
8. Returns tranId and fee

**Returns:**
```sql
tranId INT    -- Transfer ID
fee DECIMAL   -- Charged fee
```

#### sp_dispose_credit

Performs credit disposals verifying available limit.

**Parameters:**
```sql
IN p_accountId INT          -- Credit account ID
IN p_amount DECIMAL(12,2)   -- Amount to dispose
IN p_description VARCHAR(300) -- Description
```

**Process:**
1. Verifies account is type 'Credito'
2. Calculates limit with fn_calculate_credit_limit
3. Calculates available: `limit + balance`
4. Verifies amount ≤ available
5. Updates balance (subtracts amount)
6. Records in creditDisposal
7. Returns disposal information

**Returns:**
```sql
disposalId INT         -- Disposal ID
availableAfter DECIMAL -- Available credit after
creditLimit DECIMAL    -- Total limit
usedCredit DECIMAL     -- Used credit
message VARCHAR        -- Confirmation message
```

### Indexes and Optimization

```sql
-- Indexes for performance improvement
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

### Relationships

```
main (1) ──→ (N) customer
main (1) ──→ (N) employee
main (1) ──→ (N) cAccount
cAccount (1) ──→ (N) creditDisposal
cAccount (1) ──→ (N) transfer
cAccount (1) ──→ (N) deposito
cAccount (1) ──→ (N) retiros
```

### Triggers and Cascade

- **ON DELETE CASCADE**: When deleting a user, all their accounts and records are deleted
- **ON UPDATE CASCADE**: When updating mainId, changes are propagated

---

## Installation

### Prerequisites

- Node.js 18+ and npm
- Angular CLI 18+
- MySQL 8+
- Git

### 1. Clone Repository

```bash
git clone https://github.com/JoseLuisBVaz/ProyectoBanco.git
cd ProyectoBanco/ProyectoBanco
```

### 2. Install Dependencies

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

### 3. Configure Database

```bash
mysql -u root -p
```

Execute the complete script:
```sql
SOURCE src/database.sql;
```

### 4. Configure Environment Variables

Create file `src/backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=Banco_Jety
DB_PORT=3306

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

PORT=3000
```

### 5. Start Application

**Terminal 1 - Backend:**
```bash
cd src/backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
ng serve
```

### 6. Access Application

Open browser at: `http://localhost:4200`

---

## License

This project is for academic use for the Business Intelligence course.

## Authors

- José Luis Bueno Vázquez
- Banco Jety Development Team

---

**Banco Jety** © 2025
