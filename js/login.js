document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

           
            if (errorMessageDiv) {
                errorMessageDiv.style.display = 'none';
                errorMessageDiv.textContent = '';
            }

            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value;

            try {
                
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Display error if username or password is incorrect
                    showError(data.error || 'An error occurred during login.');
                } else {
                    // 1. Save logged-in user in local storage
                    localStorage.setItem('currentUser', JSON.stringify(data.user));

                    alert(`Welcome ${data.user.first_name}! Login successful.`);
                    
                    // 2. Redirect to Home Page
                    window.location.href = 'index.html';
                }

            } catch (error) {
                console.error('Error:', error);
                showError('Unable to connect to the server. Make sure Node.js is running (node server.js).');
            }
        });
    }

    function showError(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
        }
    }
});