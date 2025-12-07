# 🔄 Migración de Base de Datos - Banco JETY

## ⚠️ IMPORTANTE

La base de datos ha sido actualizada para usar **camelCase** en los nombres de columnas, coincidiendo con el código backend/frontend. Esto asegura compatibilidad en todos los sistemas operativos (Windows, Linux, Mac).

---

## 🆕 Instalación Nueva

Si estás instalando el proyecto por primera vez:

```bash
mysql -u root -p < src/database.sql
```

✅ Listo, no necesitas hacer nada más.

---

## 🔧 Migración desde Versión Anterior

Si ya tienes una base de datos con datos y necesitas migrar:

### Opción 1: Backup y Reinstalación (Recomendado)

1. **Hacer backup de los datos:**
   ```sql
   -- Conectar a MySQL
   mysql -u root -p
   
   -- Usar la base de datos
   USE banco_jety;
   
   -- Exportar datos a archivos temporales
   SELECT * INTO OUTFILE '/tmp/main_backup.csv' 
   FIELDS TERMINATED BY ',' ENCLOSED BY '"' 
   LINES TERMINATED BY '\n' 
   FROM main;
   
   -- Repetir para cada tabla: customer, employee, caccount, transfer, deposito, retiros, creditdisposal
   ```

2. **Eliminar y recrear la base de datos:**
   ```sql
   DROP DATABASE banco_jety;
   ```
   
   ```bash
   mysql -u root -p < src/database.sql
   ```

3. **Restaurar los datos:**
   ```sql
   USE banco_jety;
   
   LOAD DATA INFILE '/tmp/main_backup.csv'
   INTO TABLE main
   FIELDS TERMINATED BY ',' ENCLOSED BY '"'
   LINES TERMINATED BY '\n';
   
   -- Repetir para cada tabla
   ```

### Opción 2: Script de Migración SQL (Avanzado)

Si prefieres mantener la misma base de datos:

```sql
USE banco_jety;

-- Renombrar tabla caccount a cAccount
RENAME TABLE caccount TO cAccount;
RENAME TABLE creditdisposal TO creditDisposal;

-- Cambiar columnas de main
ALTER TABLE main CHANGE mainid mainId INT AUTO_INCREMENT;

-- Cambiar columnas de customer
ALTER TABLE customer 
  CHANGE mainid mainId INT,
  CHANGE phonenumber phoneNumber VARCHAR(12),
  CHANGE firstname firstName VARCHAR(100),
  CHANGE lastnamep lastNameP VARCHAR(50),
  CHANGE lastnamem lastNameM VARCHAR(50),
  CHANGE enterdate enterDate TIMESTAMP;

-- Cambiar columnas de employee
ALTER TABLE employee 
  CHANGE mainid mainId INT,
  CHANGE phonenumber phoneNumber VARCHAR(12),
  CHANGE firstname firstName VARCHAR(100),
  CHANGE lastnamep lastNameP VARCHAR(50),
  CHANGE lastnamem lastNameM VARCHAR(50),
  CHANGE enterdate enterDate TIMESTAMP;

-- Cambiar columnas de cAccount
ALTER TABLE cAccount 
  CHANGE accountid accountId INT AUTO_INCREMENT,
  CHANGE mainid mainId INT,
  CHANGE cardnum cardNum VARCHAR(16),
  CHANGE accnum accNum VARCHAR(10),
  CHANGE accphone accPhone VARCHAR(10),
  CHANGE acctype accType ENUM('Debito','Credito');

-- Cambiar columnas de transfer
ALTER TABLE transfer 
  CHANGE tranid tranId INT AUTO_INCREMENT,
  CHANGE dodate doDate DATE;

-- Cambiar columnas de deposito
ALTER TABLE deposito 
  CHANGE depid depId INT AUTO_INCREMENT,
  CHANGE mainid mainId INT,
  CHANGE accnum accNum VARCHAR(10),
  CHANGE depositdate depositDate TIMESTAMP;

-- Cambiar columnas de retiros
ALTER TABLE retiros 
  CHANGE withdrawid withdrawId INT AUTO_INCREMENT,
  CHANGE mainid mainId INT,
  CHANGE accnum accNum VARCHAR(10),
  CHANGE withdrawdate withdrawDate TIMESTAMP;

-- Cambiar columnas de creditDisposal
ALTER TABLE creditDisposal 
  CHANGE disposalid disposalId INT AUTO_INCREMENT,
  CHANGE accountid accountId INT,
  CHANGE availableafter availableAfter DECIMAL(12,2);

-- Recrear funciones y procedimientos
DROP FUNCTION IF EXISTS fn_calculate_credit_limit;
DROP PROCEDURE IF EXISTS sp_transfer_funds;
DROP PROCEDURE IF EXISTS sp_deposit_funds;
DROP PROCEDURE IF EXISTS sp_dispose_credit;

-- Ejecutar las funciones y procedimientos del archivo database.sql
-- (Copiar y pegar desde el archivo database.sql las secciones de:
--  - fn_calculate_credit_limit
--  - sp_transfer_funds
--  - sp_deposit_funds
--  - sp_dispose_credit)
```

---

## 📋 Cambios Realizados

### Tablas Renombradas:
- `caccount` → `cAccount`
- `creditdisposal` → `creditDisposal`

### Columnas Actualizadas (todas las tablas):

| Tabla | Antes | Ahora |
|-------|-------|-------|
| main | `mainid` | `mainId` |
| customer | `mainid`, `phonenumber`, `firstname`, `lastnamep`, `lastnamem`, `enterdate` | `mainId`, `phoneNumber`, `firstName`, `lastNameP`, `lastNameM`, `enterDate` |
| employee | `mainid`, `phonenumber`, `firstname`, `lastnamep`, `lastnamem`, `enterdate` | `mainId`, `phoneNumber`, `firstName`, `lastNameP`, `lastNameM`, `enterDate` |
| cAccount | `accountid`, `mainid`, `cardnum`, `accnum`, `accphone`, `acctype` | `accountId`, `mainId`, `cardNum`, `accNum`, `accPhone`, `accType` |
| transfer | `tranid`, `dodate` | `tranId`, `doDate` |
| deposito | `depid`, `mainid`, `accnum`, `depositdate` | `depId`, `mainId`, `accNum`, `depositDate` |
| retiros | `withdrawid`, `mainid`, `accnum`, `withdrawdate` | `withdrawId`, `mainId`, `accNum`, `withdrawDate` |
| creditDisposal | `disposalid`, `accountid`, `availableafter` | `disposalId`, `accountId`, `availableAfter` |

### Valores ENUM Actualizados:
- `accType`: `'debito'/'credito'` → `'Debito'/'Credito'`

---

## ✅ Verificación Post-Migración

Después de migrar, verifica que todo funcione correctamente:

```sql
-- Verificar estructura de tablas
DESCRIBE main;
DESCRIBE customer;
DESCRIBE cAccount;

-- Verificar que los datos se conservaron
SELECT COUNT(*) FROM main;
SELECT COUNT(*) FROM cAccount;

-- Probar una consulta típica
SELECT m.mainId, m.mail, c.firstName, c.lastNameP 
FROM main m 
JOIN customer c ON m.mainId = c.mainId 
LIMIT 5;
```

---

## 🐛 Solución de Problemas

### Error: "Column 'mainid' doesn't exist"
- ✅ La migración fue exitosa, el código ahora busca `mainId` correctamente

### Error: "Unknown column 'acctype'"
- ✅ Verifica que usaste el script de migración completo

### Los datos desaparecieron
- ⚠️ Restaurar desde el backup creado en el paso 1

---

## 📞 Soporte

Si tienes problemas con la migración, revisa:
1. Que hayas hecho backup de tus datos
2. Que tengas permisos suficientes en MySQL
3. Que no haya tablas bloqueadas

**Nota:** Esta migración garantiza que el proyecto funcione en cualquier sistema operativo sin problemas de mayúsculas/minúsculas en SQL.
