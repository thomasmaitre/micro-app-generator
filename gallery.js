// API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://web-production-72b3.up.railway.app';

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
            const categoriesResponse = await fetch(`${API_URL}/api/categories`);
            const categories = await categoriesResponse.json();
            
            // Fetch providers from API
            const providersResponse = await fetch(`${API_URL}/api/providers`);
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
            const response = await fetch(`${API_URL}/api/gallery`);
            if (!response.ok) throw new Error('Failed to fetch micro-apps');
            microApps = await response.json();
            displayMicroApps(microApps);
        } catch (error) {
            console.error('Error fetching micro-apps:', error);
            microAppCards.innerHTML = '<p class="error-message">Failed to load micro-apps. Please try again later.</p>';
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
            card.onclick = () => openModal(app._id);
            card.innerHTML = `
                <div class="card-content">
                    <h3>${app.title}</h3>
                    <p>${app.description}</p>
                    <div class="card-tags">
                        ${app.categories.map(cat => `<span class="tag category-tag">${cat}</span>`).join('')}
                        ${app.providers.map(prov => `<span class="tag provider-tag">${prov}</span>`).join('')}
                    </div>
                    <div class="card-actions" onclick="event.stopPropagation()">
                        <button onclick="toggleUpvote('${app._id}', this)" class="upvote-btn ${app.upvoted ? 'active' : ''}">
                            <i class="fas fa-thumbs-up"></i>
                            <span class="upvote-count">${app.upvotes || 0}</span>
                        </button>
                    </div>
                </div>
            `;
            microAppCards.appendChild(card);
        });
    }

    // Modal functionality
    const modal = document.getElementById('galleryCardModalDetails');
    const closeButton = document.querySelector('.close-button');
    let currentAppId = null;

    // Make openModal function globally available
    window.openModal = async function(appId) {
        currentAppId = appId;
        const app = microApps.find(app => app._id === appId);
        if (!app) {
            console.error('App not found');
            return;
        }
        
        // Populate modal content
        const modalImage = document.getElementById('modalCardImage');
        if (app.image && app.image.startsWith('data:image/')) {
            modalImage.src = app.image;
        } else {
            modalImage.src = '/images/placeholder.jpg';
        }
        modalImage.onerror = () => {
            console.error('Failed to load image for app:', appId);
            modalImage.src = '/images/placeholder.jpg';
            modalImage.onerror = null; // Prevent infinite loop
        };
        
        document.getElementById('modalTitle').textContent = app.title;
        document.getElementById('modalDescription').textContent = app.description;
        
        // Populate categories
        const categoriesContainer = document.getElementById('modalCategories');
        categoriesContainer.innerHTML = app.categories
            .map(category => `<span class="tag category-tag">${category}</span>`)
            .join('');
        
        // Populate providers
        const providersContainer = document.getElementById('modalProviders');
        providersContainer.innerHTML = app.providers
            .map(provider => `<span class="tag provider-tag">${provider}</span>`)
            .join('');
        
        // Set up button handlers
        const downloadBtn = document.getElementById('downloadCardJson');
        const generateBtn = document.getElementById('generateMicroApp');
        
        if (downloadBtn) downloadBtn.onclick = () => downloadJSON(appId);
        if (generateBtn) generateBtn.onclick = () => generateMicroApp(appId);
        
        // Show modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    };

    // Close modal when clicking the close button or outside the modal
    if (closeButton) {
        closeButton.onclick = closeModal;
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restore scrolling
            currentAppId = null;
        }
    }

    // Generate micro-app function
    async function generateMicroApp(appId) {
        try {
            // First, get the micro-app details
            const response = await fetch(`${API_URL}/api/micro-app/${appId}`);
            if (!response.ok) throw new Error('Failed to fetch micro-app data');
            const app = await response.json();
            
            // Generate full micro-app JSON
            const generateResponse = await fetch(`${API_URL}/api/generate-micro-app`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: app.title,
                    description: app.description,
                    categories: app.categories,
                    providers: app.providers
                })
            });

            if (!generateResponse.ok) throw new Error('Failed to generate micro-app');
            const data = await generateResponse.json();
            
            if (!data.success || !data.microAppJson) {
                throw new Error('Invalid response from generator');
            }

            // Display JSON in modal
            const jsonContent = document.getElementById('jsonContent');
            jsonContent.textContent = data.microAppJson;
            
            // Show modal
            const jsonModal = document.getElementById('jsonModal');
            jsonModal.style.display = 'block';
            
            // Setup copy button
            const copyButton = document.getElementById('copyJsonButton');
            copyButton.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(data.microAppJson);
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard';
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy:', error);
                    copyButton.innerHTML = '<i class="fas fa-times"></i> Failed to copy';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard';
                    }, 2000);
                }
            };
        } catch (error) {
            console.error('Error generating micro-app:', error);
        }
    }

    // Download JSON function
    async function downloadJSON(appId) {
        try {
            const response = await fetch(`${API_URL}/api/micro-app/${appId}`);
            if (!response.ok) throw new Error('Failed to fetch micro-app data');
            const data = await response.json();
            
            // Get only the cardJson from the response
            const cardJson = data.cardJson;
            
            // Display JSON in modal
            const jsonContent = document.getElementById('jsonContent');
            jsonContent.textContent = JSON.stringify(cardJson, null, 2);
            
            // Show modal
            const jsonModal = document.getElementById('jsonModal');
            jsonModal.style.display = 'block';
            
            // Setup copy button
            const copyButton = document.getElementById('copyJsonButton');
            copyButton.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(JSON.stringify(cardJson, null, 2));
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard';
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy:', error);
                    copyButton.innerHTML = '<i class="fas fa-times"></i> Failed to copy';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy to Clipboard';
                    }, 2000);
                }
            };
        } catch (error) {
            console.error('Error fetching JSON:', error);
        }
    }

    // Close JSON modal
    window.closeJsonModal = function() {
        const jsonModal = document.getElementById('jsonModal');
        jsonModal.style.display = 'none';
    }

    // Close JSON modal when clicking outside
    window.onclick = function(event) {
        const jsonModal = document.getElementById('jsonModal');
        if (event.target === jsonModal) {
            jsonModal.style.display = 'none';
        }
    }

    // Toggle upvote function
    async function toggleUpvote(appId, button) {
        try {
            const response = await fetch(`${API_URL}/api/upvote/${appId}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to toggle upvote');
            const data = await response.json();
            
            // Update UI
            button.classList.toggle('active');
            const countElement = button.querySelector('.upvote-count');
            if (countElement) {
                countElement.textContent = data.upvotes;
            }
        } catch (error) {
            console.error('Error toggling upvote:', error);
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
