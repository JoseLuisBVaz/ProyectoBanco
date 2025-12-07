# 🚀 Despliegue en AWS con Nginx

Guía completa para desplegar Banco JETY en AWS EC2 con Nginx y PM2.


## 📋 Requisitos Previos en AWS



## 1️⃣ Preparar el Servidor EC2

### Conectarse al servidor:
```bash
ssh -i "tu-clave.pem" ubuntu@tu-ip-publica
```

### Actualizar el sistema:
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar dependencias:
```bash
# Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL Client (si usas RDS, solo necesitas el cliente)
sudo apt install -y mysql-client

# Nginx
sudo apt install -y nginx

# Git
sudo apt install -y git

# PM2 (gestor de procesos)
sudo npm install -g pm2

# Angular CLI (para compilar el frontend)
sudo npm install -g @angular/cli
```


## 2️⃣ Clonar el Proyecto

```bash
cd /var/www
sudo git clone https://github.com/JoseLuisBVaz/ProyectoBanco.git
sudo chown -R $USER:$USER ProyectoBanco
cd ProyectoBanco/ProyectoBanco
```


## 3️⃣ Configurar la Base de Datos

### Si usas RDS MySQL:
```bash
mysql -h tu-endpoint-rds.region.rds.amazonaws.com -u admin -p
```

### Si usas MySQL local:
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
mysql -u root -p
```

### Ejecutar el script:
```sql
source src/database.sql
```

### Configurar credenciales del backend:
```bash
nano src/backend/db.js
```

Cambiar:
```javascript
const db = mysql.createConnection({
  host: 'tu-endpoint-rds.amazonaws.com',  // o 'localhost'
  user: 'admin',
  password: 'tu-password-seguro',
  database: 'Banco_Jety',
});
```


## 4️⃣ Instalar Dependencias

### Backend:
```bash
cd src/backend
npm install --production
cd ../..
```

### Frontend:
```bash
npm install
```


## 5️⃣ Compilar el Frontend

```bash
npm run build
```

Esto genera archivos en: `dist/ProyectoBanco/browser/`


## 6️⃣ Configurar PM2 (Backend)

### Iniciar el backend:
```bash
pm2 start ecosystem.config.js --env production
```

### Verificar que está corriendo:
```bash
pm2 status
pm2 logs banco-jety-backend
```

### Guardar configuración:
```bash
pm2 save
pm2 startup
# Ejecutar el comando que PM2 te muestre
```


## 7️⃣ Configurar Nginx

### Copiar configuración:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/banco-jety
```

### Editar la configuración:
```bash
sudo nano /etc/nginx/sites-available/banco-jety
```

Cambiar:

### Habilitar el sitio:
```bash
sudo ln -s /etc/nginx/sites-available/banco-jety /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Opcional: remover sitio por defecto
```

### Verificar configuración:
```bash
sudo nginx -t
```

### Reiniciar Nginx:
```bash
sudo systemctl restart nginx
```


## 8️⃣ Verificar el Despliegue

### Comprobar servicios:
```bash
# Backend
curl http://localhost:3000/api/usuarios/main

# Nginx
sudo systemctl status nginx

# PM2
pm2 status
```

### Acceder desde el navegador:
```
http://tu-ip-publica
```


## 🔄 Despliegue Continuo

Para actualizar el proyecto después de hacer cambios:

```bash
cd /var/www/ProyectoBanco/ProyectoBanco
chmod +x deploy.sh
./deploy.sh
```

El script `deploy.sh` automáticamente:
1. Descarga cambios de Git
2. Instala dependencias
3. Compila el frontend
4. Reinicia el backend
5. Recarga Nginx


## 🔒 Configurar HTTPS (Opcional pero Recomendado)

### Instalar Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtener certificado SSL:
```bash
sudo certbot --nginx -d tu-dominio.com
```

Certbot configurará automáticamente Nginx para HTTPS.


## 📊 Monitoreo

### Ver logs del backend:
```bash
pm2 logs banco-jety-backend
pm2 monit
```

### Ver logs de Nginx:
```bash
sudo tail -f /var/log/nginx/banco-jety-access.log
sudo tail -f /var/log/nginx/banco-jety-error.log
```

### Ver métricas de PM2:
```bash
pm2 web
# Acceder a: http://tu-ip:9615
```


## 🛠️ Solución de Problemas

### El backend no inicia:
```bash
pm2 logs banco-jety-backend --err
# Revisar errores de conexión a MySQL
```

### Nginx devuelve 502 Bad Gateway:
```bash
# Verificar que el backend esté corriendo
pm2 status

# Verificar conectividad
curl http://localhost:3000/api/usuarios/main
```

### No se pueden conectar a la BD:
```bash
# Verificar Security Group de RDS
# Debe permitir tráfico desde el Security Group de EC2 en puerto 3306

# Probar conexión
mysql -h tu-endpoint-rds.amazonaws.com -u admin -p
```


## 🔐 Seguridad Recomendada

1. **Configurar firewall UFW:**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Cambiar puerto SSH:** Editar `/etc/ssh/sshd_config`

3. **Usar IAM roles** en lugar de credenciales hardcodeadas

4. **Configurar backups automáticos** de RDS

5. **Actualizar regularmente:**
```bash
sudo apt update && sudo apt upgrade -y
```


## 💰 Estimación de Costos AWS



**¿Necesitas ayuda?** Consulta la documentación completa en `INSTALACION.md`
