const express = require('express');
const cors = require('cors');
const usuariosRoutes = require('./routes/usuarios');

const app = express();

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
	next();
});

// === RUTAS ===
app.use('/api', usuariosRoutes);

// === MANEJO DE ERRORES 404 ===
app.use((req, res) => {
	res.status(404).json({ msg: 'Ruta no encontrada', path: req.originalUrl });
});

// === SERVIDOR ===
const PORT = 3000;
const server = app.listen(PORT, () => {
	console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// Manejo de cierre del servidor
const shutdown = (code = 0) => {
	console.log('Cerrando servidor...');
	server.close(() => {
		console.log('Servidor cerrado correctamente');
		process.exit(code);
	});
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
