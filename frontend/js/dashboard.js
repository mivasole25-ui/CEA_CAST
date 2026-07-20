// Lógica del Panel de Control (Dashboard) - CEA Castellanos

// Redireccionar peticiones locales /api/... al servidor backend en el puerto 3001
const DASHBOARD_API_URL = 'http://127.0.0.1:3001';

const ORIGINAL_FETCH = window.fetch;

window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
        input = `${DASHBOARD_API_URL}${input}`;
    }
    return ORIGINAL_FETCH(input, init);
};

// Variables de Sesión
let currentUser = null;
let currentToken = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar Sesión
    currentToken = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!currentToken || !userStr) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(userStr);

    // 2. Mostrar Información de Usuario en el Sidebar
    document.getElementById('user-display-name').innerText = currentUser.nombre;
    document.getElementById('user-display-role').innerText = currentUser.role;

    // 3. Mostrar Fecha Actual y Bienvenida
    const welcomeText = document.getElementById('welcome-text');
    if (welcomeText) {
        welcomeText.innerText = `¡Bienvenido al CEA, ${currentUser.nombre}!`;
    }
    
    const dateText = document.getElementById('current-date-text');
    if (dateText) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateText.innerText = new Date().toLocaleDateString('es-ES', options);
    }

    // 4. Configurar Menús según el Rol
    if (currentUser.role === 'administrador') {
        document.getElementById('menu-admin').style.display = 'block';
        switchPanel('admin-resumen'); // Panel inicial de admin
    } else if (currentUser.role === 'instructor') {
        document.getElementById('menu-instructor').style.display = 'block';
        switchPanel('instructor-agenda'); // Panel inicial de instructor
    }
});

/**
 * Cambiar entre paneles del Dashboard
 */
function switchPanel(panelId) {
    // Ocultar todos los paneles
    const panels = document.querySelectorAll('.dashboard-panel');
    panels.forEach(p => p.classList.remove('active'));

    // Desactivar todos los items del menú
    const menuItems = document.querySelectorAll('.sidebar-item');
    menuItems.forEach(i => i.classList.remove('active'));

    // Activar el panel seleccionado
    const activePanel = document.getElementById(panelId);
    if (activePanel) {
        activePanel.classList.add('active');
    }

    // Activar el elemento de menú seleccionado en el sidebar
    // Buscamos el elemento de lista que tiene la llamada onclick correspondiente
    menuItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(panelId)) {
            item.classList.add('active');
        }
    });

    // Cargar datos del panel activo
    cargarDatosPanel(panelId);
}

/**
 * Carga los datos correspondientes desde la API según el panel abierto
 */
function cargarDatosPanel(panelId) {
    switch (panelId) {
        case 'admin-resumen':
            cargarResumenAdmin();
            break;
        case 'admin-agenda':
            cargarAgendaCompletaAdmin();
            break;
        case 'admin-crear':
            cargarFormularioAsignacion();
            break;
        case 'admin-auditoria':
            // Se ejecuta al hacer búsqueda, pero limpiamos
            document.getElementById('audit-table-body').innerHTML = '<tr><td colspan="4" style="text-align:center;">Realiza una búsqueda para ver resultados.</td></tr>';
            break;
        case 'admin-vehiculos':
            cargarMonitoreoVehicular();
            break;
        case 'instructor-agenda':
            cargarAgendaInstructor();
            break;
        case 'instructor-alumnos':
            cargarAlumnosInstructor();
            break;
        case 'instructor-preop':
            cargarFormularioPreoperacional();
            break;
    }
}

// ==========================================
// FUNCIONES DE CARGA Y RENDERIZADO (API)
// ==========================================

const API_HEADERS = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

/**
 * 1. Resumen de Administrador (Métricas y últimas clases)
 */
async function cargarResumenAdmin() {
    try {
        // Cargar Métricas en Paralelo
        const [resStudents, resVehicles, resAppointments] = await Promise.all([
            fetch('/api/students', { headers: API_HEADERS() }),
            fetch('/api/vehicles', { headers: API_HEADERS() }),
            fetch('/api/appointments', { headers: API_HEADERS() })
        ]);

        if (resStudents.ok && resVehicles.ok && resAppointments.ok) {
            const students = await resStudents.json();
            const vehicles = await resVehicles.json();
            const appointments = await resAppointments.json();

            document.getElementById('metric-students-count').innerText = students.length;
            document.getElementById('metric-vehicles-count').innerText = vehicles.length;
            document.getElementById('metric-appointments-count').innerText = appointments.length;
        }

        // Cargar últimas 5 clases
        const resLatest = await fetch('/api/appointments/latest', { headers: API_HEADERS() });
        const tbody = document.getElementById('admin-latest-appointments-table');
        if (resLatest.ok && tbody) {
            const latest = await resLatest.json();
            tbody.innerHTML = '';

            if (latest.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay clases programadas.</td></tr>';
                return;
            }

            latest.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${app.student_name}</strong></td>
                    <td>${app.instructor_name}</td>
                    <td>${app.vehicle_model} (${app.vehicle_plate})</td>
                    <td><span class="vehicle-plate" style="background: rgba(59,130,246,0.1); color: var(--primary); border-color: rgba(59,130,246,0.2);">${app.class_type}</span></td>
                    <td>${app.date}</td>
                    <td>${app.time}</td>
                    <td>${app.duration} hrs</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar resumen admin:', error);
        mostrarToast('Error al cargar datos del resumen.', 'error');
    }
}

/**
 * 2. Cargar la Agenda Completa de Administrador
 */
async function cargarAgendaCompletaAdmin() {
    const tbody = document.getElementById('admin-all-appointments-table');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando clases...</td></tr>';
        const res = await fetch('/api/appointments', { headers: API_HEADERS() });
        
        if (res.ok) {
            const list = await res.json();
            tbody.innerHTML = '';

            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay clases registradas.</td></tr>';
                return;
            }

            list.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${app.date}</td>
                    <td>${app.time}</td>
                    <td><strong>${app.student_name}</strong></td>
                    <td>${app.instructor_name}</td>
                    <td>${app.vehicle_model} (${app.vehicle_plate})</td>
                    <td><span class="vehicle-plate" style="background: rgba(59,130,246,0.1); color: var(--primary); border-color: rgba(59,130,246,0.2);">${app.class_type}</span></td>
                    <td>${app.duration} hrs</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar agenda:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error al cargar datos.</td></tr>';
    }
}

/**
 * 3. Cargar opciones de alumnos, instructores y vehículos en el formulario de asignación
 */
async function cargarFormularioAsignacion() {
    const selectStudent = document.getElementById('select-student');
    const selectInstructor = document.getElementById('select-instructor');
    const selectVehicle = document.getElementById('select-vehicle');

    if (!selectStudent || !selectInstructor || !selectVehicle) return;

    try {
        // Cargar alumnos, vehículos y instructores
        const [resStudents, resVehicles, resInstructors] = await Promise.all([
            fetch('/api/students', { headers: API_HEADERS() }),
            fetch('/api/vehicles', { headers: API_HEADERS() }),
            fetch('/api/auth/instructors', { headers: API_HEADERS() }) // Ruta nueva que agregaremos
        ]);

        if (resStudents.ok) {
            const students = await resStudents.json();
            selectStudent.innerHTML = '<option value="" disabled selected>Seleccione un alumno</option>';
            students.forEach(s => {
                selectStudent.innerHTML += `<option value="${s.id}">${s.name} (${s.email})</option>`;
            });
        }

        if (resVehicles.ok) {
            const vehicles = await resVehicles.json();
            selectVehicle.innerHTML = '<option value="" disabled selected>Seleccione un vehículo</option>';
            vehicles.forEach(v => {
                if (v.status === 'activo') {
                    selectVehicle.innerHTML += `<option value="${v.id}">${v.model} - ${v.plate} (${v.type.toUpperCase()})</option>`;
                }
            });
        }

        if (resInstructors.ok) {
            const instructors = await resInstructors.json();
            selectInstructor.innerHTML = '<option value="" disabled selected>Seleccione un instructor</option>';
            instructors.forEach(i => {
                selectInstructor.innerHTML += `<option value="${i.id}">${i.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error al poblar formulario:', error);
        mostrarToast('Error al cargar listas del formulario.', 'error');
    }
}

/**
 * Manejador del submit de crear clase (Admin)
 */
async function handleCreateAppointment(event) {
    event.preventDefault();

    const student_id = document.getElementById('select-student').value;
    const instructor_id = document.getElementById('select-instructor').value;
    const vehicle_id = document.getElementById('select-vehicle').value;
    const class_type = document.getElementById('select-class-type').value;
    const date = document.getElementById('input-date').value;
    const time = document.getElementById('input-time').value;
    const duration = document.getElementById('input-duration').value;

    if (!student_id || !instructor_id || !vehicle_id || !class_type || !date || !time || !duration) {
        mostrarToast('Por favor diligencie todos los campos.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: API_HEADERS(),
            body: JSON.stringify({ student_id, instructor_id, vehicle_id, class_type, date, time, duration })
        });

        const data = await res.json();

        if (res.ok) {
            mostrarToast('Clase programada con éxito.', 'success');
            document.getElementById('form-create-appointment').reset();
            setTimeout(() => switchPanel('admin-agenda'), 1000);
        } else {
            mostrarToast(data.message || 'Error al programar la clase.', 'error');
        }
    } catch (error) {
        console.error('Error al guardar clase:', error);
        mostrarToast('Error de conexión con el servidor.', 'error');
    }
}

/**
 * 4. Auditoría de búsqueda (Admin)
 */
async function runAudit() {
    const searchType = document.getElementById('audit-type').value;
    const searchQuery = document.getElementById('audit-search-input').value.trim();
    const thead = document.getElementById('audit-table-header');
    const tbody = document.getElementById('audit-table-body');

    if (!searchQuery) {
        mostrarToast('Ingresa un criterio de búsqueda.', 'error');
        return;
    }

    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Buscando...</td></tr>';
        
        if (searchType === 'alumno') {
            thead.innerHTML = `
                <tr>
                    <th>Alumno</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Progreso del Curso</th>
                </tr>
            `;

            const res = await fetch('/api/students', { headers: API_HEADERS() });
            if (res.ok) {
                const students = await res.json();
                const filtered = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
                tbody.innerHTML = '';

                if (filtered.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No se encontraron alumnos con ese nombre.</td></tr>';
                    return;
                }

                filtered.forEach(s => {
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${s.name}</strong></td>
                            <td>${s.email}</td>
                            <td>${s.phone || 'N/A'}</td>
                            <td>
                                <div style="display:flex; align-items:center; gap: 10px;">
                                    <span>${s.progress}%</span>
                                    <div class="progress-bar-container" style="flex-grow:1; max-width: 150px;">
                                        <div class="progress-bar" style="width: ${s.progress}%"></div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
        } else {
            thead.innerHTML = `
                <tr>
                    <th>Instructor</th>
                    <th>Clases Programadas</th>
                    <th>Email</th>
                </tr>
            `;

            const [resInstructors, resAppointments] = await Promise.all([
                fetch('/api/auth/instructors', { headers: API_HEADERS() }),
                fetch('/api/appointments', { headers: API_HEADERS() })
            ]);

            if (resInstructors.ok && resAppointments.ok) {
                const instructors = await resInstructors.json();
                const appointments = await resAppointments.json();

                const filtered = instructors.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
                tbody.innerHTML = '';

                if (filtered.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No se encontraron instructores.</td></tr>';
                    return;
                }

                filtered.forEach(inst => {
                    const count = appointments.filter(a => a.instructor_name === inst.name).length;
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${inst.name}</strong></td>
                            <td><span class="vehicle-plate" style="background:rgba(16,185,129,0.1); color:var(--success); border-color:rgba(16,185,129,0.2);">${count} clases</span></td>
                            <td>${inst.email}</td>
                        </tr>
                    `;
                });
            }
        }
    } catch (error) {
        console.error('Error en auditoría:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Error al ejecutar la búsqueda.</td></tr>';
    }
}

/**
 * 5. Monitoreo Vehicular y Visualización de Checklist Preoperacionales (Admin)
 */
async function cargarMonitoreoVehicular() {
    const grid = document.getElementById('admin-vehicles-grid');
    const tbody = document.getElementById('admin-preoperational-table');

    if (!grid || !tbody) return;

    try {
        // Cargar Vehículos
        const resVehicles = await fetch('/api/vehicles', { headers: API_HEADERS() });
        if (resVehicles.ok) {
            const vehicles = await resVehicles.json();
            grid.innerHTML = '';

            vehicles.forEach(v => {
                const card = document.createElement('div');
                card.className = 'vehicle-card';
                card.innerHTML = `
                    <div class="vehicle-header">
                        <span class="vehicle-plate">${v.plate}</span>
                        <span class="vehicle-status status-${v.status.toLowerCase()}">${v.status}</span>
                    </div>
                    <h3>${v.model}</h3>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">Tipo: ${v.type.toUpperCase()}</p>
                `;
                grid.appendChild(card);
            });
        }

        // Cargar Reportes Preoperacionales
        const resReports = await fetch('/api/reports', { headers: API_HEADERS() });
        if (resReports.ok) {
            const reports = await resReports.json();
            tbody.innerHTML = '';

            if (reports.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No se han recibido inspecciones mecánicas aún.</td></tr>';
                return;
            }

            reports.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.date}</td>
                    <td><span class="vehicle-plate">${r.vehicle_plate}</span></td>
                    <td><strong>${r.instructor_name}</strong></td>
                    <td>${statusCell(r.brakes)}</td>
                    <td>${statusCell(r.lights)}</td>
                    <td>${statusCell(r.tires)}</td>
                    <td>${statusCell(r.fluids)}</td>
                    <td>${statusCell(r.mirrors)}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.observations || ''}">${r.observations || '<em>Sin observaciones</em>'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar monitoreo:', error);
        mostrarToast('Error al cargar datos vehiculares.', 'error');
    }
}

function statusCell(val) {
    if (val === 'bueno') {
        return `<span style="color: var(--success); font-weight: bold;">✔️ Bueno</span>`;
    }
    return `<span style="color: var(--danger); font-weight: bold;">❌ Falla</span>`;
}

// ==========================================
// SECCIONES DEL INSTRUCTOR
// ==========================================

/**
 * 6. Cargar Agenda del Instructor
 */
async function cargarAgendaInstructor() {
    const tbody = document.getElementById('instructor-schedule-table');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando tu agenda...</td></tr>';
        const res = await fetch('/api/appointments', { headers: API_HEADERS() });

        if (res.ok) {
            const list = await res.json();
            tbody.innerHTML = '';

            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No tienes clases programadas asignadas.</td></tr>';
                return;
            }

            list.forEach(app => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${app.date}</td>
                    <td>${app.time}</td>
                    <td><strong>${app.student_name}</strong></td>
                    <td>${app.vehicle_model}</td>
                    <td><span class="vehicle-plate">${app.vehicle_plate}</span></td>
                    <td><span class="vehicle-plate" style="background: rgba(59,130,246,0.1); color: var(--primary); border-color: rgba(59,130,246,0.2);">${app.class_type}</span></td>
                    <td>${app.duration} hrs</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error al cargar agenda instructor:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Error al cargar tu agenda.</td></tr>';
    }
}

/**
 * 7. Cargar Alumnos asignados al Instructor
 */
async function cargarAlumnosInstructor() {
    const grid = document.getElementById('instructor-students-grid');
    if (!grid) return;

    try {
        grid.innerHTML = '<p style="text-align:center; width:100%;">Cargando tus alumnos...</p>';

        // Obtenemos las clases asignadas al instructor
        const resAppointments = await fetch('/api/appointments', { headers: API_HEADERS() });
        const resStudents = await fetch('/api/students', { headers: API_HEADERS() });

        if (resAppointments.ok && resStudents.ok) {
            const appointments = await resAppointments.json();
            const students = await resStudents.json();

            // Extraemos los nombres de alumnos únicos con clases con este instructor
            const studentEmails = [...new Set(appointments.map(a => a.student_email))];

            // Filtramos la lista completa de alumnos que tengan clases vigentes
            const myStudents = students.filter(s => studentEmails.includes(s.email));
            grid.innerHTML = '';

            if (myStudents.length === 0) {
                grid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">No tienes alumnos asignados actualmente.</p>';
                return;
            }

            myStudents.forEach(s => {
                const card = document.createElement('div');
                card.className = 'student-card';
                card.innerHTML = `
                    <div class="student-header">
                        <h3>${s.name}</h3>
                        <span class="vehicle-plate" style="background:rgba(16,185,129,0.1); color:var(--success); border-color:rgba(16,185,129,0.2);">${s.progress}% completado</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">Contacto: ${s.phone || 'N/A'}</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">Email: ${s.email}</p>
                    <div class="progress-bar-container" style="margin-top:10px;">
                        <div class="progress-bar" style="width: ${s.progress}%"></div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error al cargar alumnos del instructor:', error);
        grid.innerHTML = '<p style="text-align:center; width:100%; color:var(--danger);">Error al cargar ficha de alumnos.</p>';
    }
}

/**
 * 8. Cargar el formulario checklist preoperacional
 */
async function cargarFormularioPreoperacional() {
    const select = document.getElementById('preop-select-vehicle');
    const inputDate = document.getElementById('preop-date');

    if (!select || !inputDate) return;

    // Colocar fecha de hoy
    const today = new Date().toISOString().split('T')[0];
    inputDate.value = today;

    try {
        const res = await fetch('/api/vehicles', { headers: API_HEADERS() });
        if (res.ok) {
            const vehicles = await res.json();
            select.innerHTML = '<option value="" disabled selected>Seleccione el vehículo</option>';
            vehicles.forEach(v => {
                if (v.status === 'activo') {
                    select.innerHTML += `<option value="${v.id}">${v.model} - ${v.plate} (${v.type.toUpperCase()})</option>`;
                }
            });
        }
    } catch (error) {
        console.error('Error al cargar vehículos preoperacional:', error);
    }
}

/**
 * Manejador del submit de revisión preoperacional
 */
async function handlePreoperationalSubmit(event) {
    event.preventDefault();

    const vehicle_id = document.getElementById('preop-select-vehicle').value;
    const date = document.getElementById('preop-date').value;
    const brakes = document.querySelector('input[name="brakes"]:checked').value;
    const lights = document.querySelector('input[name="lights"]:checked').value;
    const tires = document.querySelector('input[name="tires"]:checked').value;
    const fluids = document.querySelector('input[name="fluids"]:checked').value;
    const mirrors = document.querySelector('input[name="mirrors"]:checked').value;
    const observations = document.getElementById('preop-observations').value.trim();

    if (!vehicle_id || !date || !brakes || !lights || !tires || !fluids || !mirrors) {
        mostrarToast('Por favor diligencie todos los campos requeridos.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/reports', {
            method: 'POST',
            headers: API_HEADERS(),
            body: JSON.stringify({ vehicle_id, date, brakes, lights, tires, fluids, mirrors, observations })
        });

        const data = await res.json();

        if (res.ok) {
            mostrarToast(data.message, 'success');
            document.getElementById('form-preoperational').reset();
            setTimeout(() => switchPanel('instructor-agenda'), 1200);
        } else {
            mostrarToast(data.message || 'Error al enviar reporte.', 'error');
        }
    } catch (error) {
        console.error('Error al guardar reporte:', error);
        mostrarToast('Error al conectar con el servidor.', 'error');
    }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function mostrarToast(mensaje, tipo) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'alert-toast';
    
    let icon = 'ℹ️';
    let borderColor = 'rgba(59, 130, 246, 0.4)';
    if (tipo === 'success') {
        icon = '✔️';
        borderColor = 'rgba(16, 185, 129, 0.4)';
        toast.style.borderLeft = '4px solid var(--success)';
    } else if (tipo === 'error') {
        icon = '❌';
        borderColor = 'rgba(239, 68, 68, 0.4)';
        toast.style.borderLeft = '4px solid var(--danger)';
    }

    toast.style.borderColor = borderColor;
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span style="font-size: 0.9rem; font-weight: 500;">${mensaje}</span>
    `;

    container.appendChild(toast);

    // Remover a los 3.5 segundos
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
