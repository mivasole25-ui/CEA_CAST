const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/appointments
 * @desc    Obtener lista de clases programadas (los instructores solo ven las suyas, admin ve todas)
 */
router.get('/', protect, async (req, res) => {
    try {
        const pool = getPool();
        let query = `
            SELECT
                a.id,
                a.type AS class_type,
                DATE_FORMAT(a.date, '%Y-%m-%d') as date,
                a.time,
                a.duration_hours AS duration,
                s.name AS student_name,
                s.email AS student_email,
                u.name AS instructor_name,
                v.plate AS vehicle_plate, 
                v.model AS vehicle_model,
                v.type AS vehicle_type
            FROM appointments a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON a.instructor_id = u.id
            JOIN vehicles v ON a.vehicle_id = v.id
        `;
        const params = [];

        // Si es instructor, filtrar solo por sus clases asignadas
        if (req.user.role === 'instructor') {
            query += ` WHERE a.instructor_id = ? `;
            params.push(req.user.id);
        }

        query += ` ORDER BY a.date ASC, a.time ASC `;

        const [appointments] = await pool.query(query, params);
        res.json(appointments);
    } catch (error) {
        console.error('Error al obtener agendamientos:', error);
        res.status(500).json({ message: 'Error interno al obtener el calendario de clases.' });
    }
});

/**
 * @route   GET /api/appointments/latest
 * @desc    Obtener las últimas clases programadas (generalmente para resumen de admin)
 */
router.get('/latest', protect, async (req, res) => {
    try {
        const pool = getPool();
        let query = `
            SELECT
                a.id,
                a.type AS class_type,
                DATE_FORMAT(a.date, '%Y-%m-%d') as date,
                a.time,
                a.duration_hours AS duration,
                s.name AS student_name,
                u.name AS instructor_name,
                v.plate AS vehicle_plate,
                v.model AS vehicle_model,
                v.type AS vehicle_type
            FROM appointments a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON a.instructor_id = u.id
            JOIN vehicles v ON a.vehicle_id = v.id
        `;
        const params = [];

        if (req.user.role === 'instructor') {
            query += ` WHERE a.instructor_id = ? `;
            params.push(req.user.id);
        }

        query += ` ORDER BY a.created_at DESC LIMIT 5 `;

        const [appointments] = await pool.query(query, params);
        res.json(appointments);
    } catch (error) {
        console.error('Error al obtener últimos agendamientos:', error);
        res.status(500).json({ message: 'Error al obtener últimos agendamientos.' });
    }
});

/**
 * @route   POST /api/appointments
 * @desc    Programar/Asignar una clase (solo administradores)
 */
router.post('/', protect, async (req, res) => {
    const { student_id, instructor_id, vehicle_id, class_type, date, time, duration } = req.body;

    if (!student_id || !instructor_id || !vehicle_id || !class_type || !date || !time || !duration) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios para programar una clase.' });
    }

    try {
        const pool = getPool();

        // Validar que el estudiante exista
        const [student] = await pool.query('SELECT id FROM students WHERE id = ?', [student_id]);
        if (student.length === 0) {
            return res.status(404).json({ message: 'El estudiante seleccionado no existe.' });
        }

        // Validar que el instructor exista y sea de rol instructor
        const [instructor] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'instructor'", [instructor_id]);
        if (instructor.length === 0) {
            // Permitir administrador también por si acaso, pero normalmente es instructor
            const [anyUser] = await pool.query("SELECT id FROM users WHERE id = ?", [instructor_id]);
            if (anyUser.length === 0) {
                return res.status(404).json({ message: 'El instructor seleccionado no existe.' });
            }
        }

        // Validar que el vehículo exista
        const [vehicle] = await pool.query('SELECT id, status FROM vehicles WHERE id = ?', [vehicle_id]);
        if (vehicle.length === 0) {
            return res.status(404).json({ message: 'El vehículo seleccionado no existe.' });
        }
        if (vehicle[0].status === 'mantenimiento') {
            return res.status(400).json({ message: 'El vehículo seleccionado se encuentra en mantenimiento.' });
        }

        // Guardar el agendamiento
       await pool.query(
    'INSERT INTO appointments (student_id, instructor_id, vehicle_id, type, date, time, duration_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [student_id, instructor_id, vehicle_id, class_type, date, time, duration]
);

        // Actualizar progreso del alumno (por ejemplo, sumarle 5% o simplemente dejarlo como está)
        await pool.query(
            'UPDATE students SET progress = GREATEST(progress + 5, 100) WHERE id = ?',
            [student_id]
        );

        res.status(201).json({ message: 'Clase programada con éxito.' });
    } catch (error) {
        console.error('Error al programar clase:', error);
        res.status(500).json({ message: 'Error interno al programar la clase.' });
    }
});

module.exports = router;
