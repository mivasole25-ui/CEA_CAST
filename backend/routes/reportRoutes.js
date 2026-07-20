const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/reports
 * @desc    Obtener lista de todas las revisiones preoperacionales
 */
router.get('/', protect, async (req, res) => {
    try {
        const pool = getPool();
        const query = `
            SELECT 
                r.id, 
                DATE_FORMAT(r.date, '%Y-%m-%d') as date, 
                r.brakes, 
                r.lights, 
                r.tires, 
                r.fluids, 
                r.mirrors, 
                r.observations,
                v.plate AS vehicle_plate, 
                v.model AS vehicle_model,
                u.name AS instructor_name
            FROM preoperational_reports r
            JOIN vehicles v ON r.vehicle_id = v.id
            JOIN users u ON r.instructor_id = u.id
            ORDER BY r.created_at DESC
        `;
        const [reports] = await pool.query(query);
        res.json(reports);
    } catch (error) {
        console.error('Error al obtener reportes preoperacionales:', error);
        res.status(500).json({ message: 'Error interno al obtener los reportes preoperacionales.' });
    }
});

/**
 * @route   POST /api/reports
 * @desc    Crear una revisión preoperacional (normalmente enviada por instructores)
 */
router.post('/', protect, async (req, res) => {
    const { vehicle_id, date, brakes, lights, tires, fluids, mirrors, observations } = req.body;
    const instructor_id = req.user.id; // Obtenido del token JWT

    if (!vehicle_id || !date || !brakes || !lights || !tires || !fluids || !mirrors) {
        return res.status(400).json({ message: 'Todos los campos de inspección mecánica y fluidos son obligatorios.' });
    }

    try {
        const pool = getPool();

        // Validar que el vehículo exista
        const [vehicle] = await pool.query('SELECT id, plate FROM vehicles WHERE id = ?', [vehicle_id]);
        if (vehicle.length === 0) {
            return res.status(404).json({ message: 'El vehículo seleccionado no existe.' });
        }

        // Insertar reporte preoperacional
        await pool.query(
            `INSERT INTO preoperational_reports 
            (vehicle_id, instructor_id, date, brakes, lights, tires, fluids, mirrors, observations) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [vehicle_id, instructor_id, date, brakes, lights, tires, fluids, mirrors, observations || '']
        );

        // Si algún componente está "malo", cambiar estado del vehículo a "mantenimiento" de manera preventiva
        const tieneFallas = brakes === 'malo' || lights === 'malo' || tires === 'malo' || fluids === 'malo' || mirrors === 'malo';
        if (tieneFallas) {
            await pool.query(
                "UPDATE vehicles SET status = 'mantenimiento' WHERE id = ?",
                [vehicle_id]
            );
            console.log(`Vehículo con placa ${vehicle[0].plate} puesto en mantenimiento de forma preventiva.`);
        }

        res.status(201).json({ 
            message: 'Reporte preoperacional guardado correctamente.' + (tieneFallas ? ' El vehículo fue marcado temporalmente en mantenimiento preventivo.' : '')
        });
    } catch (error) {
        console.error('Error al registrar reporte preoperacional:', error);
        res.status(500).json({ message: 'Error interno al registrar el reporte preoperacional.' });
    }
});

module.exports = router;
