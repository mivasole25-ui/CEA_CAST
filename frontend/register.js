async function register() {

    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre, correo, password })
    });

    const data = await response.json();

    document.getElementById('mensaje').innerText = data.message;

    if (response.ok) {
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    }
}