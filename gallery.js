document.addEventListener('DOMContentLoaded', async () => {
    let microApps = [];
    const microAppCards = document.getElementById('microAppCards');
    const activeFilters = {
        categories: new Set(),
        providers: new Set()
    };

    // Fetch and populate filters
    async function populateFilters() {
        try {
            // Fetch categories from API
            const categoriesResponse = await fetch('http://localhost:3000/api/categories');
            const categories = await categoriesResponse.json();
            
            // Fetch providers from API
            const providersResponse = await fetch('http://localhost:3000/api/providers');
            const providers = await providersResponse.json();

            // Populate category filters
            const categoryFilters = document.getElementById('category-filters');
            categoryFilters.innerHTML = categories.map(category => `
                <span class="filter-tag" data-type="categories" data-value="${category}">
                    ${category}
                </span>
            `).join('');

            // Populate provider filters
            const providerFilters = document.getElementById('provider-filters');
            providerFilters.innerHTML = providers.map(provider => `
                <span class="filter-tag" data-type="providers" data-value="${provider}">
                    ${provider}
                </span>
            `).join('');

            // Add click event listeners to all filter tags
            document.querySelectorAll('.filter-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const type = tag.dataset.type;
                    const value = tag.dataset.value;
                    toggleFilter(type, value, tag);
                });
            });
        } catch (error) {
            console.error('Error populating filters:', error);
        }
    }

    // Toggle filter and update display
    function toggleFilter(type, value, element) {
        if (activeFilters[type].has(value)) {
            activeFilters[type].delete(value);
            element.classList.remove('active');
        } else {
            activeFilters[type].add(value);
            element.classList.add('active');
        }
        filterMicroApps();
    }

    // Filter micro-apps based on active filters
    function filterMicroApps() {
        const filteredApps = microApps.filter(app => {
            const categoryMatch = activeFilters.categories.size === 0 || 
                app.categories.some(cat => activeFilters.categories.has(cat));
            const providerMatch = activeFilters.providers.size === 0 || 
                app.providers.some(prov => activeFilters.providers.has(prov));
            return categoryMatch && providerMatch;
        });
        displayMicroApps(filteredApps);
    }

    // Fetch micro-apps from the server
    async function fetchMicroApps() {
        try {
            const response = await fetch('http://localhost:3000/api/gallery');
            if (!response.ok) throw new Error('Failed to fetch micro-apps');
            microApps = await response.json();
            displayMicroApps(microApps);
        } catch (error) {
            console.error('Error fetching micro-apps:', error);
        }
    }

    // Display micro-apps in cards
    function displayMicroApps(apps) {
        microAppCards.innerHTML = '';
        
        if (apps.length === 0) {
            microAppCards.innerHTML = '<p class="no-results">No micro-apps found matching your filters.</p>';
            return;
        }

        apps.forEach(app => {
            const card = document.createElement('div');
            card.className = 'micro-app-card';
            
            // Create image URL using the app's ID with server URL prefix
            const imageUrl = app.image ? `http://localhost:3000/images/${app._id}` : 'default-image.png';
            
            card.innerHTML = `
                <div class="card-image">
                    <img src="${imageUrl}" alt="${app.title || 'Micro-app'} preview">
                </div>
                <div class="card-content">
                    <h3 class="card-title">${app.title || 'Untitled Micro-app'}</h3>
                    <p class="card-description">${app.description || ''}</p>
                    
                    <div class="card-tags">
                        ${app.categories ? app.categories.map(category => 
                            `<span class="category-tag">${category}</span>`
                        ).join('') : ''}
                    </div>
                    
                    <div class="card-tags">
                        ${app.providers ? app.providers.map(provider => 
                            `<span class="provider-tag">${provider}</span>`
                        ).join('') : ''}
                    </div>
                    
                    <div class="card-actions">
                        <button onclick="downloadJSON('${app._id}')" class="download-btn">Download JSON</button>
                        <button onclick="toggleUpvote('${app._id}', this)" class="upvote-btn ${app.upvoted ? 'upvoted' : ''}">
                            👍 ${app.upvotes || 0}
                        </button>
                    </div>
                </div>
            `;
            microAppCards.appendChild(card);
        });
    }

    // Download JSON function
    async function downloadJSON(appId) {
        try {
            const response = await fetch(`http://localhost:3000/api/micro-app/${appId}`);
            if (!response.ok) throw new Error('Failed to fetch micro-app data');
            
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `micro-app-${appId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading JSON:', error);
            alert('Failed to download JSON file. Please try again.');
        }
    }

    // Toggle upvote function
    async function toggleUpvote(appId, button) {
        try {
            const response = await fetch(`http://localhost:3000/api/upvote/${appId}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to update upvote');
            
            const data = await response.json();
            const countElement = button.querySelector('.upvote-count');
            countElement.textContent = data.upvotes;
            button.classList.toggle('upvoted');
        } catch (error) {
            console.error('Error updating upvote:', error);
            alert('Failed to update upvote. Please try again.');
        }
    }

    // Make functions globally available
    window.downloadJSON = downloadJSON;
    window.toggleUpvote = toggleUpvote;

    // Initialize the gallery
    async function initGallery() {
        await populateFilters();
        await fetchMicroApps();
    }

    // Initialize the gallery
    initGallery();
});
