const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_super_segura';

/**
 * Middleware para proteger rutas mediante autenticación de JWT
 */
function protect(req, res, next) {
    let token;

    // Verificar si el token viene en los headers (Authorization: Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, token ausente o inválido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Añade los datos descifrados al request
        next();
    } catch (error) {
        console.error('Error al verificar JWT:', error.message);
        return res.status(401).json({ message: 'Sesión inválida o expirada. Por favor inicia sesión de nuevo.' });
    }
}

/**
 * Middleware para restringir accesos según roles específicos
 * @param {...string} roles - Roles permitidos ('administrador', 'instructor')
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Acceso prohibido. No tienes permisos para realizar esta acción.' });
        }
        next();
    };
}

module.exports = {
    protect,
    authorize
};
