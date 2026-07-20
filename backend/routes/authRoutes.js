const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_super_segura';

/**
 * ============================================================
 * REGISTRO DE USUARIOS
 * ============================================================
 */
router.post('/register', async (req, res) => {

    const { nombre, correo, password, role } = req.body;

    if (!nombre || !correo || !password || !role) {
        return res.status(400).json({
            message: 'Todos los campos son obligatorios.'
        });
    }

    if (role !== 'administrador' && role !== 'instructor') {
        return res.status(400).json({
            message: 'Rol inválido.'
        });
    }

    try {

        const pool = getPool();

        const [existingUser] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [correo]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: 'El correo electrónico ya está registrado.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)',
            [nombre, correo, hashedPassword, role]
        );

        console.log("====================================");
        console.log("USUARIO REGISTRADO");
        console.log("Nombre:", nombre);
        console.log("Correo:", correo);
        console.log("Rol:", role);
        console.log("====================================");

        res.status(201).json({
            message: 'Usuario registrado correctamente.'
        });

    } catch (error) {

        console.error("ERROR REGISTER");
        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});

/**
 * ============================================================
 * LOGIN
 * ============================================================
 */
router.post('/login', async (req, res) => {

    console.log("\n====================================");
    console.log("INTENTO DE LOGIN");
    console.log("Datos recibidos:", req.body);

    const { correo, password } = req.body;

    if (!correo || !password) {

        console.log("Faltan datos");

        return res.status(400).json({
            message: "El correo y la contraseña son obligatorios."
        });

    }

    try {

        const pool = getPool();

        console.log("Buscando usuario...");

        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [correo]
        );

        console.log("Usuarios encontrados:", users.length);

        if (users.length === 0) {

            console.log("NO EXISTE EL USUARIO");

            return res.status(401).json({
                message: "Correo o contraseña incorrectos."
            });

        }

        const user = users[0];

        console.log("------------------------------------");
        console.log("ID:", user.id);
        console.log("Nombre:", user.name);
        console.log("Correo:", user.email);
        console.log("Rol:", user.role);
        console.log("Hash almacenado:");
        console.log(user.password);
        console.log("------------------------------------");

        console.log("Comparando contraseña...");

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        console.log("Resultado bcrypt:", isMatch);

        if (!isMatch) {

            console.log("CONTRASEÑA INCORRECTA");

            return res.status(401).json({
                message: "Correo o contraseña incorrectos."
            });

        }

        console.log("GENERANDO TOKEN...");

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        console.log("LOGIN EXITOSO");
        console.log("====================================");

        res.json({

            message: "Inicio de sesión exitoso.",

            token,

            user: {

                id: user.id,
                nombre: user.name,
                correo: user.email,
                role: user.role

            }

        });

    } catch (error) {

        console.log("ERROR LOGIN");
        console.error(error);

        res.status(500).json({
            message: error.message
        });

    }

});

/**
 * ============================================================
 * OBTENER INSTRUCTORES
 * ============================================================
 */
router.get('/instructors', protect, async (req, res) => {

    try {

        const pool = getPool();

        const [instructors] = await pool.query(
            "SELECT id,name,email FROM users WHERE role='instructor' ORDER BY name ASC"
        );

        res.json(instructors);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Error interno."
        });

    }

});

module.exports = router;