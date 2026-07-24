document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('infinite-container');

    const communityImages = [
        'images/Hudaimage2.jpg',
        'images/Hudaimage3.jpg',   
        'images/Hudaimage4.jpg',
        'images/Hudaimage5.jpg',
        'images/Hudaimage1.jpg',
        'images/téléchargement (41).jpg'
    ];

    function renderCommunityCards() {
        if (!container) return;

        communityImages.forEach((imagePath, index) => {
            const card = document.createElement('div');
            card.className = 'scroll-card';
            card.innerHTML = `
                <img src="${imagePath}" alt="Look ${index + 1}">
                <div class="scroll-card-info">
                    <h4>Glow Look #${index + 1}</h4>
                    <p>Shared by our beauty community ✨</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderCommunityCards();
});