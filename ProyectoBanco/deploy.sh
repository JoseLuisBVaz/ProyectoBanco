#!/bin/bash
echo "🚀 Desplegando Banco JETY..."

# Actualizar código
git pull origin main

# Instalar dependencias del backend
cd src/backend
npm install --production
cd ../..

# Instalar dependencias del frontend
npm install

# Compilar frontend
echo "📦 Compilando frontend..."
npm run build

# Reiniciar backend con PM2
echo "🔄 Reiniciando backend..."
pm2 restart banco-jety-backend

# Recargar nginx
echo "🌐 Recargando Nginx..."
sudo systemctl reload nginx

echo "✅ Despliegue completado!"
