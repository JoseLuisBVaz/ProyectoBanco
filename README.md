# JETY Bank

Complete banking system with comprehensive account management, transfers, credit operations, and financial services.

## Table of Contents

- [System Architecture](#system-architecture)
- [Frontend](#frontend)
- [Backend](#backend)
- [Database](#database)
- [Installation](#installation)

---

## System Architecture

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Angular | 18.x |
| **Backend** | Node.js + Express | Latest |
| **Database** | MySQL | 8.x |
| **PDF Generation** | PDFKit | Latest |
| **Email** | Nodemailer | Latest |

### Directory Structure

```
ProyectoBanco/
├── ProyectoBanco/
│   ├── src/
│   │   ├── app/
│   │   │   ├── cancelacion/
│   │   │   ├── credito/
│   │   │   ├── depositos/
│   │   │   ├── estado-cuenta/
│   │   │   ├── formulario/
│   │   │   ├── formulario-contrasena/
│   │   │   ├── guards/
│   │   │   ├── home/
│   │   │   ├── login/
│   │   │   ├── main/
│   │   │   ├── navbar/
│   │   │   ├── novedades/
│   │   │   ├── prestamos/
│   │   │   ├── progreso/
│   │   │   ├── register/
│   │   │   ├── register-emp/
│   │   │   ├── retiro/
│   │   │   ├── services/
│   │   │   ├── transfers/
│   │   │   └── user/
│   │   ├── backend/
│   │   │   ├── controller/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── config/
│   │   ├── database.sql
│   │   └── assets/
```

---

## Frontend

### Technology

Angular 18 with standalone components, TypeScript, and CSS3.

### Features

- Standalone components without NgModules
- Authentication and role-based authorization guards
- Reactive forms with validation
- Asynchronous HTTP communication
- Responsive design

### Components

#### Authentication
- **login**: User authentication
- **register**: Customer registration
- **register-emp**: Employee registration
- **formulario-contrasena**: Password recovery with verification code

#### Main Dashboard
- **home**: Dashboard with account summary and promotional credit modal
- **navbar**: Top navigation with user menu
- **main**: Welcome page
- **progreso**: Under development features page

#### Banking Operations
- **transfers**: Transfers between accounts with visual account selector
- **depositos**: Deposit registration with visual account selector
- **retiro**: Withdrawals with code generation and visual account selector
- **estado-cuenta**: Transaction history with PDF export and email delivery

#### Credit Management
- **credito**: Credit line visualization with visual account selector
- **prestamos**: Credit disposition request
- **cancelacion**: Account cancellation

#### Information
- **user**: User profile and personal data
- **novedades**: Employee portal with administrative access
- **formulario**: Bank account creation (employees)

### Routing System

```typescript
const routes: Routes = [
  { path: '', component: Main },
  { path: 'login', component: LogIn },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'transferencia', component: Transfers, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'credito', component: Credito, canActivate: [AuthGuard, RoleGuard], data: { roles: ['c'] } },
  { path: 'novedades', component: Novedades, canActivate: [AuthGuard, RoleGuard], data: { roles: ['e','m'] } },
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
Handles all user and account operations.

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
- **Promotional Modal**: Popup system for credit offers (displays every 75 seconds)
- **Notifications**: Alerts and visual feedback for operations
- **Data Masking**: Card and account number masking
- **Real-time Validation**: Instant feedback on forms
- **Visual Account Selector**: Clickable card-based account selection across transaction components

---

## Backend

### Technology

Node.js with Express framework, following MVC architecture and service pattern.

### Structure

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

#### Authentication
```
POST /api/usuarios/login
POST /api/usuarios/register
POST /api/usuarios/register-employee
POST /api/usuarios/request-password-reset
POST /api/usuarios/verify-reset-code
POST /api/usuarios/reset-password
```

#### Account Operations
```
GET /api/usuarios/accounts/:mainId
POST /api/usuarios/create-account
GET /api/usuarios/info/:mainId
```

#### Transactions
```
POST /api/usuarios/transfer
POST /api/usuarios/deposit
POST /api/usuarios/withdraw
GET /api/usuarios/statement/:accountId
POST /api/usuarios/send-statement-email
```

#### Credit
```
GET /api/usuarios/credit-line/:mainId
POST /api/usuarios/credit-disposition
```

### Services

#### emailService
Sends transactional emails (statements, password reset).

#### pdfService
Generates PDF documents for account statements.

#### passwordResetService
Manages password recovery flow with verification codes.

---

## Database

### MySQL Schema

#### Main Tables

- **usuarios**: User data (customers and employees)
- **cuentas**: Bank accounts
- **movimientos**: Transaction history
- **transferencias**: Transfer records
- **depositos**: Deposit records
- **retiros**: Withdrawal records with codes

### Key Relationships

- Users (1) → (N) Accounts
- Accounts (1) → (N) Transactions
- Accounts participate in Transfers (origin/destination)

---

## Installation

### Prerequisites

- Node.js 18+
- MySQL 8.x
- Angular CLI 18

### Database Setup

```bash
mysql -u root -p
CREATE DATABASE banco_jety;
USE banco_jety;
SOURCE ProyectoBanco/src/database.sql;
```

### Backend Setup

```bash
cd ProyectoBanco/src/backend
npm install
node server.js
```

Server runs on `http://localhost:3000`

### Frontend Setup

```bash
cd ProyectoBanco
npm install
ng serve
```

Application runs on `http://localhost:4200`

### Environment Configuration

Create `src/backend/config/email.config.js`:

```javascript
module.exports = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};
```

Or create a `.env` file in the backend directory:

```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email-here
EMAIL_PASSWORD=your-app-password-here
```

**Important**: Never commit `.env` files or real credentials to version control.

---

## Features

### For Customers
- Account dashboard with balance visualization
- Transfers between own and external accounts
- Cash deposits and withdrawals
- Credit line management
- Transaction history with PDF export
- Email statement delivery
- Password recovery system

### For Employees
- Customer account creation
- Account management
- Transaction monitoring
- Employee registration (managers only)

### Security
- Password encryption
- JWT-based authentication
- Role-based access control
- Session management
- Verification codes for sensitive operations

---

## Authors

Development team focused on modern banking solutions.

## License

