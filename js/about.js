document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('infinite-container');

    // Nombre d'éléments qu'on souhaite afficher de manière fixe (ex: 6 éléments)
    const totalItems = 6;

    // Fonction pour générer les cartes de la communauté
    function renderCommunityCards() {
        if (!container) return;

        for (let i = 1; i <= totalItems; i++) {
            const card = document.createElement('div');
            card.className = 'scroll-card';
            card.innerHTML = `
                <img src="images/Hudaimage1.jpg" alt="Look ${i}">
                <div class="scroll-card-info">
                    <h4>Glow Look #${i}</h4>
                    <p>Shared by our beauty community ✨</p>
                </div>
            `;
            container.appendChild(card);
        }
    }

    // Affichage fixe au chargement de la page
    renderCommunityCards();
});