const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/students
 * @desc    Obtener lista de todos los alumnos registrados
 */
router.get('/', protect, async (req, res) => {
    try {
        const pool = getPool();
        const [students] = await pool.query('SELECT * FROM students ORDER BY name ASC');
        res.json(students);
    } catch (error) {
        console.error('Error al obtener estudiantes:', error);
        res.status(500).json({ message: 'Error interno al obtener el listado de alumnos.' });
    }
});

/**
 * @route   POST /api/students
 * @desc    Agregar un nuevo alumno (solo admin o instructor)
 */
router.post('/', protect, async (req, res) => {
    const { nombre, correo, telefono } = req.body;

    if (!nombre || !correo) {
        return res.status(400).json({ message: 'El nombre y correo son campos obligatorios.' });
    }

    try {
        const pool = getPool();
        
        // Verificar si el correo ya existe en estudiantes
        const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [correo]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'El correo electrónico ya está asignado a otro alumno.' });
        }

        await pool.query(
            'INSERT INTO students (name, email, phone, progress) VALUES (?, ?, ?, 0)',
            [nombre, correo, telefono || null]
        );

        res.status(201).json({ message: 'Alumno registrado con éxito.' });
    } catch (error) {
        console.error('Error al registrar estudiante:', error);
        res.status(500).json({ message: 'Error interno al registrar el alumno.' });
    }
});

module.exports = router;
