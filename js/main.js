document.addEventListener('DOMContentLoaded', () => {
    // 1. Récupérer l'utilisateur connecté depuis le localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // 2. Cibler le conteneur des boutons de la navbar
    const authLinksDiv = document.querySelector('.auth-links');

    if (currentUser && authLinksDiv) {
        // Si l'utilisateur est connecté, on affiche son nom et un bouton de déconnexion
        authLinksDiv.innerHTML = `
            <span style="font-weight: bold; margin-right: 10px; color: #111111;">
                Hello, ${currentUser.first_name} 👋
            </span>
            <button id="logout-btn" class="register-btn" style="cursor: pointer; border: none;">
                Log Out
            </button>
        `;

        // 3. Gestion du clic sur "Log Out"
        document.getElementById('logout-btn').addEventListener('click', () => {
            // On efface l'utilisateur du localStorage
            localStorage.removeItem('currentUser');
            // On recharge la page pour remettre les boutons Log In / Register
            window.location.reload();
        });
    }
});