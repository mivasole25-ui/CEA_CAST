const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { initializeDatabase } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de la API
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);

// Si ninguna ruta de la API coincide, servir el index.html
app.get('*', (req, res, next) => {
    // Si la petición es para una ruta de la API, no servir index.html
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Inicializar base de datos y arrancar el servidor
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en: http://127.0.0.1:${PORT}`);
    });
}).catch(err => {
    console.error('Error durante la inicialización del servidor:', err);
});