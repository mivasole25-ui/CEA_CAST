-- Base de datos para el Proyecto CEA Castellanos
CREATE DATABASE IF NOT EXISTS software_integrado;
USE software_integrado;

-- Tabla de Usuarios (Administradores e Instructores)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('administrador', 'instructor') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Alumnos
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL,
    progress INT DEFAULT 0, -- Porcentaje de avance del curso (0 a 100)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Vehículos de la Academia
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate VARCHAR(10) NOT NULL UNIQUE, -- Placa del vehículo
    model VARCHAR(50) NOT NULL,        -- Marca y modelo
    type ENUM('carro', 'moto') NOT NULL,
    status ENUM('activo', 'mantenimiento') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Clases Programadas (Agendamientos)
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    instructor_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    class_type ENUM('teoria', 'practica') NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INT DEFAULT 2, -- Duración en horas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Tabla de Reportes Preoperacionales
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
