const express = require('express');
const cors = require('cors');
const usuariosRoutes = require('./routes/usuarios');

console.log('Iniciando server.js...');

// Diagnóstico para excepciones no manejadas
process.on('uncaughtException', err => {
	console.error('uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, promise) => {
	console.error('unhandledRejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

// Usar las rutas
app.use('/api', usuariosRoutes);

// Iniciar servidor
const server = app.listen(3000, () => console.log('🚀 Servidor corriendo en http://localhost:3000'));

// Manejo de señales para debugging: no terminamos el proceso automáticamente
// durante diagnóstico; simplemente logueamos la señal. Si más tarde queremos
// un cierre limpio podemos reactivar el exit.
const shutdown = (code = 0) => {
	console.log('shutdown() invoked with code', code, '- closing server');
	try {
		server.close(() => {
			console.log('Servidor cerrado (shutdown() callback)');
			process.exit(code);
		});
	} catch (e) {
		console.error('Error durante cierre:', e);
		process.exit(1);
	}
};

process.on('SIGINT', (sig) => {
	console.log('Recibida señal SIGINT:', sig);
	shutdown(0);
});
process.on('SIGTERM', (sig) => {
	console.log('Recibida señal SIGTERM:', sig);
	shutdown(0);
});
