# 🏦 Banco JETY - Guía de Instalación

Esta guía te ayudará a configurar y ejecutar el proyecto en cualquier máquina.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v18 o superior) - [Descargar aquí](https://nodejs.org/)
- **MySQL** (v8.0 o superior) - [Descargar aquí](https://dev.mysql.com/downloads/)
- **Git** - [Descargar aquí](https://git-scm.com/)
- Un editor de código como **VS Code** (recomendado)

---

## 🚀 Pasos de Instalación

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/JoseLuisBVaz/ProyectoBanco.git
cd ProyectoBanco/ProyectoBanco
```

### 2️⃣ Configurar la Base de Datos

> ⚠️ **IMPORTANTE:** Si ya tienes una versión anterior de la base de datos, consulta `MIGRACION_BD.md` antes de continuar.

1. **Iniciar el servidor MySQL**
   - Windows: Abrir MySQL Workbench o iniciar el servicio MySQL
   - Linux/Mac: `sudo service mysql start`

2. **Crear la base de datos**
   ```bash
   mysql -u root -p
   ```
   
3. **Ejecutar el script SQL**
   ```sql
   source src/database.sql
   ```
   
   O desde MySQL Workbench: `File > Open SQL Script` y seleccionar `src/database.sql`

> 📝 **Nota:** La base de datos ahora usa camelCase (ej: `mainId`, `firstName`) para compatibilidad multiplataforma.

### 3️⃣ Configurar el Backend

1. **Navegar a la carpeta del backend**
   ```bash
   cd src/backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar las credenciales de MySQL**
   
   Editar el archivo `src/backend/db.js` y ajustar:
   ```javascript
   const db = mysql.createConnection({
     host: 'localhost',
     user: 'tu_usuario',      // ← Cambiar aquí
     password: 'tu_password',  // ← Cambiar aquí
     database: 'Banco_Jety',
   });
   ```

4. **Iniciar el servidor backend**
   ```bash
   npm start
   ```
   
   Deberías ver: `🚀 Servidor corriendo en http://localhost:3000`

### 4️⃣ Configurar el Frontend (Angular)

1. **Abrir una nueva terminal** y navegar a la raíz del proyecto
   ```bash
   cd ProyectoBanco/ProyectoBanco
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**
   ```bash
   npm start
   ```
   
   La aplicación se abrirá en: `http://localhost:4200`

---

## ⚙️ Configuración de URLs (Opcional)

Si el backend NO está en `localhost:3000`, editar:

**`src/environments/environment.ts`**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://TU_IP:3000/api/usuarios'  // ← Cambiar aquí
};
```

---

## 🔧 Solución de Problemas

### ❌ Error: "Cannot connect to MySQL"
- Verificar que MySQL esté corriendo
- Revisar las credenciales en `src/backend/db.js`
- Verificar que la base de datos `Banco_Jety` exista

### ❌ Error: "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### ❌ Error: "Module not found"
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### ❌ El frontend no muestra las tarjetas después del login
- Verificar que el backend esté corriendo en el puerto 3000
- Abrir las DevTools del navegador (F12) y revisar la consola
- Verificar que la URL del API en `environment.ts` sea correcta

### ❌ Error: "Column 'mainid' doesn't exist"
- La base de datos no se migró correctamente
- Consultar el archivo `MIGRACION_BD.md` para instrucciones de migración

---

## 📁 Estructura del Proyecto

```
ProyectoBanco/
├── src/
│   ├── app/              # Componentes Angular
│   ├── backend/          # Servidor Node.js/Express
│   │   ├── server.js     # Punto de entrada del backend
│   │   ├── db.js         # Configuración de MySQL
│   │   └── package.json  # Dependencias del backend
│   ├── database.sql      # Script de la base de datos
│   └── environments/     # Configuración de URLs
├── angular.json          # Configuración de Angular
├── MIGRACION_BD.md       # Guía de migración de BD
└── package.json          # Dependencias del frontend
```

---

## 👥 Credenciales de Prueba

Una vez instalado, puedes crear usuarios desde:
- **Registro de Cliente**: `/register`
- **Registro de Empleado**: `/register-emp` (requiere autenticación de empleado)

---

## 📱 Preparación para Móviles

Este proyecto está preparado para ser convertido a aplicación móvil usando:
- **Ionic Capacitor** (recomendado)
- **Cordova**

El SSR está deshabilitado para facilitar la migración a plataformas móviles.

---

## 🤝 Contribuir

Si encuentras errores o tienes sugerencias:
1. Abre un issue en GitHub
2. Crea un Pull Request
3. Contacta al equipo de desarrollo

---

## 📄 Licencia

Este proyecto es parte de un proyecto académico de Inteligencia de Negocios.

---

**¿Necesitas ayuda?** Revisa la documentación completa en `README.md`
