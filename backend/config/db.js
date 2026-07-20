const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'software_integrado'
};

let pool;

/**
 * Obtener pool de conexión a la base de datos
 */
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return pool;
}

/**
 * Inicializar la base de datos (Crear tablas e insertar datos semilla si están vacías)
 */
async function initializeDatabase() {
    let connection;
    try {
        console.log('Intentando conectar a MySQL para inicialización...');
        // Conexión temporal sin especificar base de datos para asegurar que existe
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Crear base de datos si no existe
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await connection.query(`USE \`${dbConfig.database}\`;`);
        console.log(`Base de datos "${dbConfig.database}" verificada/creada.`);

        // Crear tabla de usuarios
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(120) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('administrador', 'instructor') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Crear tabla de alumnos
        await connection.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(120) NOT NULL UNIQUE,
                phone VARCHAR(20) NULL,
                progress INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Crear tabla de vehículos
        await connection.query(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plate VARCHAR(10) NOT NULL UNIQUE,
                model VARCHAR(50) NOT NULL,
                type ENUM('carro', 'moto') NOT NULL,
                status ENUM('activo', 'mantenimiento') DEFAULT 'activo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Crear tabla de clases
        await connection.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                instructor_id INT NOT NULL,
                vehicle_id INT NOT NULL,
                class_type ENUM('teoria', 'practica') NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                duration INT DEFAULT 2,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            );
        `);

        // Crear tabla de reportes preoperacionales
        await connection.query(`
            CREATE TABLE IF NOT EXISTS preoperational_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id INT NOT NULL,
                instructor_id INT NOT NULL,
                date DATE NOT NULL,
                brakes ENUM('bueno', 'malo') NOT NULL,
                lights ENUM('bueno', 'malo') NOT NULL,
                tires ENUM('bueno', 'malo') NOT NULL,
                fluids ENUM('bueno', 'malo') NOT NULL,
                mirrors ENUM('bueno', 'malo') NOT NULL,
                observations TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
                FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Estructura de tablas verificada en MySQL.');

        // Insertar datos de prueba si las tablas están vacías
        await seedDatabase(connection);

    } catch (error) {
        console.error('CRÍTICO: No se pudo conectar a MySQL. Asegúrate de tener XAMPP MySQL corriendo.', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

/**
 * Sembrar datos iniciales de prueba (Seed data)
 */
async function seedDatabase(connection) {
    const bcrypt = require('bcryptjs');

    // 1. Sembrar usuarios de prueba si la tabla users está vacía
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
        console.log('Sembrando usuarios de prueba...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        await connection.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['Miguel Instructor', 'test@test.com', hashedPassword, 'instructor']
        );
        await connection.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['Admin CEA', 'admin@cea.com', hashedPassword, 'administrador']
        );
    }

    // 2. Sembrar alumnos de prueba
    const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
    if (students[0].count === 0) {
        console.log('Sembrando alumnos de prueba...');
        await connection.query(
            'INSERT INTO students (name, email, phone, progress) VALUES (?, ?, ?, ?)',
            ['Juan Pérez', 'juan.perez@email.com', '3123456789', 45]
        );
        await connection.query(
            'INSERT INTO students (name, email, phone, progress) VALUES (?, ?, ?, ?)',
            ['María Gómez', 'maria.gomez@email.com', '3159876543', 20]
        );
        await connection.query(
            'INSERT INTO students (name, email, phone, progress) VALUES (?, ?, ?, ?)',
            ['Carlos Rodríguez', 'carlos.rod@email.com', '3001112222', 80]
        );
        await connection.query(
            'INSERT INTO students (name, email, phone, progress) VALUES (?, ?, ?, ?)',
            ['Laura Martínez', 'laura.mtz@email.com', '3187776655', 0]
        );
    }

    // 3. Sembrar vehículos de prueba
    const [vehicles] = await connection.query('SELECT COUNT(*) as count FROM vehicles');
    if (vehicles[0].count === 0) {
        console.log('Sembrando vehículos de prueba...');
        await connection.query(
            'INSERT INTO vehicles (plate, model, type, status) VALUES (?, ?, ?, ?)',
            ['MNO-456', 'Chevrolet Onix 2023', 'carro', 'activo']
        );
        await connection.query(
            'INSERT INTO vehicles (plate, model, type, status) VALUES (?, ?, ?, ?)',
            ['XYZ-789', 'Yamaha FZ25 2022', 'moto', 'activo']
        );
        await connection.query(
            'INSERT INTO vehicles (plate, model, type, status) VALUES (?, ?, ?, ?)',
            ['ABC-123', 'Renault Logan 2021', 'carro', 'mantenimiento']
        );
        await connection.query(
            'INSERT INTO vehicles (plate, model, type, status) VALUES (?, ?, ?, ?)',
            ['QWE-012', 'Suzuki Gixxer 150', 'moto', 'activo']
        );
    }

    // 4. Sembrar clases de prueba (agendamientos)
    const [appointments] = await connection.query('SELECT COUNT(*) as count FROM appointments');
    if (appointments[0].count === 0) {
        console.log('Sembrando agendamientos de prueba...');
        
        // Obtener ids insertados
        const [[student]] = await connection.query('SELECT id FROM students LIMIT 1');
        const [[instructor]] = await connection.query("SELECT id FROM users WHERE role = 'instructor' LIMIT 1");
        const [[vehicle]] = await connection.query("SELECT id FROM vehicles WHERE type = 'carro' AND status = 'activo' LIMIT 1");

        if (student && instructor && vehicle) {
            await connection.query(
                'INSERT INTO appointments (student_id, instructor_id, vehicle_id, class_type, date, time, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [student.id, instructor.id, vehicle.id, 'practica', '2026-07-20', '08:00:00', 2]
            );
            await connection.query(
                'INSERT INTO appointments (student_id, instructor_id, vehicle_id, class_type, date, time, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [student.id, instructor.id, vehicle.id, 'teoria', '2026-07-21', '10:00:00', 2]
            );
        }
    }
}

module.exports = {
    getPool,
    initializeDatabase
};
