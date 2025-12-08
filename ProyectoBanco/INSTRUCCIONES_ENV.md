# ⚠️ IMPORTANTE - LEE ESTO PRIMERO

## 🔥 ACCIÓN REQUERIDA ANTES DE EJECUTAR EL SERVIDOR

Para que el sistema de transferencias interbancarias funcione correctamente, **DEBES** crear el archivo `.env` en la carpeta `src/backend/`.

---

## 📋 Instrucciones

### Paso 1: Abrir PowerShell en la carpeta del backend
```powershell
cd "E:\Documentos\Codes\Inteligencia_de_Negocios\ProyectoBanco\ProyectoBanco\src\backend"
```

### Paso 2: Copiar el archivo de plantilla
```powershell
Copy-Item .env.TEMPLATE .env
```

### Paso 3: Verificar que se creó correctamente
```powershell
Get-Content .env
```

Deberías ver el contenido con todas las variables de entorno, incluyendo:
```
DREAM_WALLET_API_URL=http://3.130.29.73:3000/api/interbank/recibir
DREAM_WALLET_API_KEY=jety_api_key_abc123
DREAM_WALLET_AUTHORIZED_KEY=dream_wallet_key_xyz789
```

---

## ✅ Verificación

El archivo `.env` debe contener estas secciones:

1. ✉️ **Configuración de Email** (EMAIL_USER, EMAIL_PASS)
2. 🗄️ **Configuración de Base de Datos** (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
3. ⚙️ **Configuración del Servidor** (PORT, NODE_ENV)
4. 🏦 **Configuración de Integración Interbancaria** (DREAM_WALLET_API_URL, DREAM_WALLET_API_KEY, DREAM_WALLET_AUTHORIZED_KEY)

---

## 🚨 Si NO creas el archivo .env

El servidor funcionará, pero las transferencias externas **FALLARÁN** con errores como:
- `DREAM_WALLET_API_URL is not defined`
- `Cannot read property 'DREAM_WALLET_API_KEY' of undefined`

---

## 🔐 Seguridad

El archivo `.env` contiene información sensible (contraseñas, API Keys) por lo que:

✅ **NUNCA** subir `.env` a Git  
✅ `.env` ya está en `.gitignore`  
✅ Compartir solo `.env.example` o `.env.TEMPLATE`  

---

## 📞 ¿Problemas?

Si después de crear `.env` sigues teniendo errores:

1. **Reinicia el servidor** (`Ctrl+C` y luego `npm start`)
2. Verifica que el archivo se llame exactamente `.env` (sin espacios, sin extensión adicional)
3. Verifica que esté en `src/backend/.env` (NO en la raíz del proyecto)

---

## ✅ ¡Listo!

Una vez que hayas creado el archivo `.env`, el sistema de transferencias interbancarias estará completamente funcional.

**Recuerda reiniciar el servidor después de crear el archivo.**
