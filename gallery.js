document.addEventListener('DOMContentLoaded', loadGallery);

async function loadGallery() {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');

    try {
        const response = await fetch('http://localhost:3000/api/images');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load images');
        }

        // Remove loading message
        if (loading) {
            loading.remove();
        }

        // Display images
        if (data.images && data.images.length > 0) {
            data.images.forEach(imageData => {
                const card = document.createElement('div');
                card.className = 'gallery-card';
                
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${imageData.image}`;
                img.alt = 'Micro-app preview';
                img.className = 'gallery-image';
                
                card.appendChild(img);
                gallery.appendChild(card);
            });
        } else {
            gallery.innerHTML = `
                <div class="empty-gallery">
                    <p>No micro-apps have been published yet.</p>
                    <a href="index.html" class="button">Create a Micro-app</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        if (loading) {
            loading.textContent = 'Error loading gallery. Please try again later.';
            loading.className = 'error-message';
        }
    }
}
