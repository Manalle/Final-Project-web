document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessageDiv = document.getElementById('error-message');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';

        const formData = {
            first_name: document.getElementById('first-name').value.trim(),
            last_name: document.getElementById('last-name').value.trim(),
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm-password').value
        };

        if (formData.password !== formData.confirm_password) {
            showError('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.error || 'An error occurred during registration.');
            } else {
                alert('Registration successful! You will be redirected to the login page.');
                window.location.href = 'login.html';
            }

        } catch (error) {
            console.error('Error:', error);
            showError('Unable to connect to the server. Make sure Node.js is running.');
        }
    });

    function showError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
    }
});