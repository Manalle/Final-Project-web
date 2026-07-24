document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const authLinksDiv = document.querySelector('.auth-links');

    if (currentUser && authLinksDiv) {
        authLinksDiv.innerHTML = `
            <span style="font-weight: bold; margin-right: 10px; color: #111111;">
                Hello, ${currentUser.first_name} 👋
            </span>
            <button id="logout-btn" class="register-btn" style="cursor: pointer; border: none;">
                Log Out
            </button>
        `;

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.reload();
        });
    }
});