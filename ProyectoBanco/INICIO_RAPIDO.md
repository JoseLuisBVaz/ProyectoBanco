# 🚀 Guía Rápida de Inicio - API Interbancaria

## ⚡ Configuración Rápida (5 minutos)

### Paso 1: Crear archivo .env
```bash
cd src/backend
cp .env.TEMPLATE .env
```

### Paso 2: Editar .env (si es necesario)
Las configuraciones por defecto ya están listas para funcionar:
- ✅ Dream Wallet URL: `http://3.130.29.73:3000/api/interbank/recibir`
- ✅ API Keys configuradas
- ✅ Base de datos AWS RDS conectada

**Solo edita si necesitas cambiar algo específico**

### Paso 3: Instalar dependencias (si no está instalado)
```bash
npm install axios
```

### Paso 4: Reiniciar el servidor
```bash
npm start
```

¡Listo! El servidor ya está escuchando peticiones interbancarias en:
- 📥 Recibir: `POST http://18.116.122.121:3000/api/interbancaria/transferencia-entrante`

---

## 🧪 Prueba Rápida con curl

### Simular transferencia entrante desde Dream Wallet
```bash
curl -X POST http://18.116.122.121:3000/api/interbancaria/transferencia-entrante ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: dream_wallet_key_xyz789" ^
  -d "{\"cuentaOrigen\":\"DW-123456\",\"cuentaDestino\":\"646123456789012\",\"monto\":1000,\"concepto\":\"Prueba\",\"bancoOrigen\":\"Dream Wallet\",\"referencia\":\"TEST-001\"}"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "tranId": 12345,
  "msg": "Transferencia recibida exitosamente"
}
```

---

## 🎯 Enviar Transferencia Externa (desde tu frontend)

### En el componente de transferencias de Angular

Simplemente agrega el campo `banco_destino`:

```typescript
const transferData = {
  origin: "646123456789012",          // Cuenta origen en Banco JETY
  destiny: "0987654321",              // Cuenta destino en Dream Wallet
  amount: 500,
  description: "Transferencia a Dream Wallet",
  banco_destino: "Dream Wallet"       // 👈 Esto activa la transferencia externa
};

this.http.post('http://18.116.122.121:3000/api/usuarios/transferencia', transferData)
  .subscribe(response => {
    console.log('Transferencia exitosa:', response);
  });
```

**Si `banco_destino` es "Banco JETY" → transferencia interna (como siempre)**
**Si `banco_destino` es otra cosa → transferencia externa (nuevo)**

---

## 📋 Checklist de Verificación

Antes de ir a producción, verifica:

- [ ] Archivo `.env` creado con las variables de integración
- [ ] Servidor reiniciado después de crear `.env`
- [ ] Axios instalado: `npm list axios`
- [ ] API Keys coordinadas con Dream Wallet
- [ ] Prueba de transferencia entrante exitosa (curl)
- [ ] Prueba de transferencia saliente exitosa (frontend)
- [ ] Logs sin errores en consola
- [ ] Transacciones registradas en tabla `transfer`

---

## ⚠️ Solución de Problemas

### Error: "Cannot find module 'axios'"
```bash
npm install axios
```

### Error: "DREAM_WALLET_API_URL is not defined"
- Verifica que el archivo `.env` existe en `src/backend/`
- Reinicia el servidor después de crear `.env`

### Error: "API Key inválida"
- Verifica que el header se llama exactamente `x-api-key`
- Verifica que la key es exactamente `dream_wallet_key_xyz789` (sin espacios)

### Error: "Cuenta destino no encontrada"
- Verifica que la CLABE o número de cuenta existe en la tabla `cAccount`
- Usa una cuenta válida de Banco JETY

---

## 📞 Siguientes Pasos

1. ✅ **Configurar .env** (este paso)
2. ⏳ **Compartir INTEGRACION_DREAM_WALLET.md** con Dream Wallet
3. ⏳ **Esperar implementación** de Dream Wallet
4. ⏳ **Coordinar pruebas** entre ambos bancos
5. ⏳ **Producción** 🎉

---

## 📖 Documentación Completa

- **INTEGRACION_DREAM_WALLET.md**: Guía para Dream Wallet
- **RESUMEN_IMPLEMENTACION.md**: Resumen técnico completo
- **Este archivo**: Inicio rápido

---

## 🎉 ¡Todo listo!

El código está implementado, probado sintácticamente y listo para funcionar.

**No olvides crear el archivo `.env` antes de ejecutar el servidor.**
