const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/vehicles
 * @desc    Obtener lista de todos los vehículos
 */
router.get('/', protect, async (req, res) => {
    try {
        const pool = getPool();
        const [vehicles] = await pool.query('SELECT * FROM vehicles ORDER BY plate ASC');
        res.json(vehicles);
    } catch (error) {
        console.error('Error al obtener vehículos:', error);
        res.status(500).json({ message: 'Error interno al obtener la flota de vehículos.' });
    }
});

/**
 * @route   POST /api/vehicles
 * @desc    Registrar un nuevo vehículo
 */
router.post('/', protect, async (req, res) => {
    const { placa, modelo, tipo, estado } = req.body;

    if (!placa || !modelo || !tipo) {
        return res.status(400).json({ message: 'La placa, modelo y tipo de vehículo son campos obligatorios.' });
    }

    if (tipo !== 'carro' && tipo !== 'moto') {
        return res.status(400).json({ message: 'El tipo debe ser carro o moto.' });
    }

    try {
        const pool = getPool();

        // Verificar si la placa ya existe
        const [existing] = await pool.query('SELECT id FROM vehicles WHERE plate = ?', [placa]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'La placa del vehículo ya está registrada.' });
        }

        await pool.query(
            'INSERT INTO vehicles (plate, model, type, status) VALUES (?, ?, ?, ?)',
            [placa.toUpperCase(), modelo, tipo, estado || 'activo']
        );

        res.status(201).json({ message: 'Vehículo registrado correctamente.' });
    } catch (error) {
        console.error('Error al registrar vehículo:', error);
        res.status(500).json({ message: 'Error interno al registrar el vehículo.' });
    }
});

module.exports = router;
