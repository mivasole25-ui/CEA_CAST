// Lógica de Autenticación para el Proyecto CEA Castellanos

const API_BASE_URL = 'http://localhost:3001/api/auth';

/**
 * Función para Iniciar Sesión
 */
async function login() {
    const correoInput = document.getElementById('correo');
    const passwordInput = document.getElementById('password');
    const mensajeDiv = document.getElementById('mensaje');
    const btnLogin = document.getElementById('btn-login');

    if (!correoInput || !passwordInput || !mensajeDiv) return;

    const correo = correoInput.value.trim();
    const password = passwordInput.value.trim();

    // Validación en el frontend antes de llamar al backend
    if (!validarFormularioLogin(correo, password)) {
        mostrarMensaje('Por favor, corrige los campos marcados en rojo.', 'error');
        return;
    }

    try {
        btnLogin.disabled = true;
        btnLogin.innerText = 'Ingresando...';
        mostrarMensaje('Validando credenciales...', 'info');

        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensaje('¡Inicio de sesión exitoso! Redirigiendo...', 'success');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            const mensajeError = data.message || 'Correo o contraseña incorrectos.';
            mostrarMensaje(mensajeError, 'error');

            mostrarErrorCampo('correo', ' ');
            mostrarErrorCampo('password', mensajeError);

            btnLogin.disabled = false;
            btnLogin.innerText = 'Ingresar al Sistema';
        }
    } catch (error) {
        console.error('Error en login:', error);
        mostrarMensaje('Error de conexión con el servidor. Verifica que el backend esté ejecutándose.', 'error');
        btnLogin.disabled = false;
        btnLogin.innerText = 'Ingresar al Sistema';
    }
}

/**
 * ==========================================
 * VALIDACIONES DEL FORMULARIO DE LOGIN
 * ==========================================
 */
function validarFormularioLogin(correo, password) {
    let esValido = true;

    limpiarErrorCampo('correo');
    limpiarErrorCampo('password');

    if (!correo) {
        mostrarErrorCampo('correo', 'El correo es obligatorio.');
        esValido = false;
    } else if (!esCorreoValido(correo)) {
        mostrarErrorCampo('correo', 'Ingresa un correo válido (ej: usuario@dominio.com).');
        esValido = false;
    }

    if (!password) {
        mostrarErrorCampo('password', 'La contraseña es obligatoria.');
        esValido = false;
    }

    return esValido;
}

/**
 * ==========================================
 * VALIDACIONES DEL FORMULARIO DE REGISTRO
 * ==========================================
 */

function esCorreoValido(correo) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
}

function esPasswordValido(password) {
    return password.length >= 6;
}

function esNombreValido(nombre) {
    if (nombre.length < 3) return false;
    const regexSoloTexto = /^[A-Za-zÀ-ÿ\s]+$/;
    return regexSoloTexto.test(nombre);
}

function mostrarErrorCampo(inputId, mensaje) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(`error-${inputId}`);
    if (input) input.classList.add('input-invalid');
    if (errorSpan) errorSpan.innerText = mensaje;
}

function limpiarErrorCampo(inputId) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(`error-${inputId}`);
    if (input) input.classList.remove('input-invalid');
    if (errorSpan) errorSpan.innerText = '';
}

function limpiarErroresRegistro() {
    ['nombre', 'correo', 'password', 'role'].forEach(limpiarErrorCampo);
}

function validarFormularioRegistro(nombre, correo, password, role) {
    let esValido = true;
    limpiarErroresRegistro();

    if (!nombre) {
        mostrarErrorCampo('nombre', 'El nombre es obligatorio.');
        esValido = false;
    } else if (!esNombreValido(nombre)) {
        mostrarErrorCampo('nombre', 'Ingresa un nombre válido (mínimo 3 letras, sin números).');
        esValido = false;
    }

    if (!correo) {
        mostrarErrorCampo('correo', 'El correo es obligatorio.');
        esValido = false;
    } else if (!esCorreoValido(correo)) {
        mostrarErrorCampo('correo', 'Ingresa un correo válido (ej: usuario@dominio.com).');
        esValido = false;
    }

    if (!password) {
        mostrarErrorCampo('password', 'La contraseña es obligatoria.');
        esValido = false;
    } else if (!esPasswordValido(password)) {
        mostrarErrorCampo('password', 'La contraseña debe tener al menos 6 caracteres.');
        esValido = false;
    }

    if (!role) {
        mostrarErrorCampo('role', 'Selecciona un rol.');
        esValido = false;
    }

    return esValido;
}

/**
 * Función para Registrar Personal
 */
async function register() {
    const nombreInput = document.getElementById('nombre');
    const correoInput = document.getElementById('correo');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');
    const mensajeDiv = document.getElementById('mensaje');
    const btnRegistrar = document.getElementById('btn-registrar');

    if (!nombreInput || !correoInput || !passwordInput || !roleSelect || !mensajeDiv) return;

    const nombre = nombreInput.value.trim();
    const correo = correoInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    if (!validarFormularioRegistro(nombre, correo, password, role)) {
        mostrarMensaje('Por favor, corrige los campos marcados en rojo.', 'error');
        return;
    }

    try {
        btnRegistrar.disabled = true;
        btnRegistrar.innerText = 'Registrando...';

        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, correo, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensaje('¡Usuario registrado correctamente! Redirigiendo a inicio de sesión...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            const mensajeError = data.message || 'Error al registrar el usuario.';
            mostrarMensaje(mensajeError, 'error');

            const mensajeEnMinusculas = mensajeError.toLowerCase();
            if (mensajeEnMinusculas.includes('correo') || mensajeEnMinusculas.includes('email')) {
                mostrarErrorCampo('correo', mensajeError);
            }

            btnRegistrar.disabled = false;
            btnRegistrar.innerText = 'Registrar Usuario';
        }
    } catch (error) {
        console.error('Error en register:', error);
        mostrarMensaje('Error al conectar con el servidor. Verifica que el backend esté ejecutándose.', 'error');
        btnRegistrar.disabled = false;
        btnRegistrar.innerText = 'Registrar Usuario';
    }
}

/**
 * Función para Cerrar Sesión
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * Muestra un mensaje en el DOM con estilos CSS adecuados
 */
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) return;

    mensajeDiv.innerText = texto;
    mensajeDiv.className = '';

    if (tipo === 'error') {
        mensajeDiv.style.color = '#ef4444';
        mensajeDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    } else if (tipo === 'success') {
        mensajeDiv.style.color = '#10b981';
        mensajeDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    } else if (tipo === 'info') {
        mensajeDiv.style.color = '#3b82f6';
        mensajeDiv.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }

    mensajeDiv.style.padding = '10px';
    mensajeDiv.style.borderRadius = '6px';
    mensajeDiv.style.marginTop = '15px';
    mensajeDiv.style.textAlign = 'center';
    mensajeDiv.style.fontSize = '0.9rem';
}

/**
 * ==========================================
 * VALIDACIÓN EN TIEMPO REAL (mientras se escribe)
 * ==========================================
 */
document.addEventListener('DOMContentLoaded', () => {
    const nombreInput = document.getElementById('nombre');
    const correoInput = document.getElementById('correo');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');

    const esFormularioRegistro = !!nombreInput;

    if (nombreInput) {
        nombreInput.addEventListener('blur', () => {
            const valor = nombreInput.value.trim();
            if (valor && !esNombreValido(valor)) {
                mostrarErrorCampo('nombre', 'Nombre inválido (mínimo 3 letras, sin números).');
            } else {
                limpiarErrorCampo('nombre');
            }
        });
    }

    if (correoInput) {
        correoInput.addEventListener('blur', () => {
            const valor = correoInput.value.trim();
            if (valor && !esCorreoValido(valor)) {
                mostrarErrorCampo('correo', 'Ingresa un correo válido.');
            } else {
                limpiarErrorCampo('correo');
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const valor = passwordInput.value.trim();
            if (esFormularioRegistro) {
                if (valor && !esPasswordValido(valor)) {
                    mostrarErrorCampo('password', 'Mínimo 6 caracteres.');
                } else {
                    limpiarErrorCampo('password');
                }
            } else {
                if (valor) {
                    limpiarErrorCampo('password');
                }
            }
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            limpiarErrorCampo('role');
        });
    }
});
