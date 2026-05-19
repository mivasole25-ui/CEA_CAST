async function login() {

    const correo = document.getElementById('correo').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correo, password })
    });

    const data = await response.json();

    document.getElementById('mensaje').innerText = data.message;

    if (response.ok) {
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
} 