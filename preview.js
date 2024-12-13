// API URL based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://web-production-72b3.up.railway.app';

let selectedApps = [];
let availableApps = [];

// Global functions for modal and app selection operations
async function copyUrl(button) {
    const input = button.parentElement.querySelector('input');
    const text = input.value;
    
    try {
        await navigator.clipboard.writeText(text);
        button.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        input.select();
        document.execCommand('copy');
        button.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    }
}

function closePublishModal(button) {
    const modal = button.closest('.modal');
    if (modal) {
        modal.remove();
    }
}

function toggleAppSelection(card, app) {
    card.classList.toggle('selected');
}

function confirmAppSelection() {
    const selectedCards = document.querySelectorAll('.app-card.selected');
    selectedApps = Array.from(selectedCards).map(card => {
        const appTitle = card.querySelector('h3').textContent;
        const app = availableApps.find(app => app.title === appTitle);
        return app;
    });
    
    updateSelectedAppsList();
    closeAppSelector();
}

function closeAppSelector() {
    const modal = document.getElementById('appSelectorModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateSelectedAppsList() {
    const selectedAppsList = document.getElementById('selectedAppsList');
    if (!selectedAppsList) return;
    
    selectedAppsList.innerHTML = '';
    
    selectedApps.forEach((app, index) => {
        const appElement = document.createElement('div');
        appElement.className = 'app-service';
        appElement.innerHTML = `
            <div class="service-icon">
                <i class="${app.icon || 'fas fa-cube'}"></i>
            </div>
            <div class="service-info">
                <h4>${app.title}</h4>
            </div>
            <div class="app-controls">
                <button class="app-control-btn edit" onclick="editAppIcon(${index})" title="Edit Icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="app-control-btn delete" onclick="deleteApp(${index})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        selectedAppsList.appendChild(appElement);
    });
    
    updatePreview();
}

function deleteApp(index) {
    selectedApps.splice(index, 1);
    updateSelectedAppsList();
}

function updatePreview() {
    const appServices = document.getElementById('appServices');
    if (!appServices) return;
    
    appServices.innerHTML = '';
    
    selectedApps.forEach(app => {
        const serviceElement = document.createElement('div');
        serviceElement.className = 'app-service';
        serviceElement.setAttribute('data-app-id', app._id);
        serviceElement.innerHTML = `
            <div class="service-icon">
                <i class="fas fa-${app.icon || 'cube'}"></i>
            </div>
            <div class="service-info">
                <h4>${app.title}</h4>
            </div>
        `;
        
        serviceElement.addEventListener('click', () => openMobileModal(app));
        appServices.appendChild(serviceElement);
    });
}

function openMobileModal(app) {
    const modal = document.getElementById('mobileAppModal');
    const title = document.getElementById('mobileModalTitle');
    const body = document.getElementById('mobileModalBody');
    const appServices = document.getElementById('appServices');
    
    if (!modal || !title || !body || !appServices) return;
    
    title.textContent = app.title;
    body.innerHTML = '';
    
    try {
        // Create an AdaptiveCard instance
        var adaptiveCard = new AdaptiveCards.AdaptiveCard();
        
        // Parse and render the card
        adaptiveCard.parse(app.cardJson);
        let renderedCard = adaptiveCard.render();
        body.appendChild(renderedCard);
    } catch (error) {
        console.error('Error rendering card:', error);
        body.innerHTML = `<p>Error rendering card: ${error.message}</p>`;
    }
    
    // Hide app services and show modal
    appServices.style.display = 'none';
    modal.style.display = 'block';
}

function closeMobileModal() {
    const modal = document.getElementById('mobileAppModal');
    const appServices = document.getElementById('appServices');
    
    if (!modal || !appServices) return;
    
    // Hide modal and show app services with animation
    modal.style.display = 'none';
    appServices.style.display = 'grid';
}

async function loadAvailableApps() {
    try {
        // Fetch apps, categories, and providers in parallel
        const [appsResponse, categoriesResponse, providersResponse] = await Promise.all([
            fetch(`${API_URL}/api/gallery`),
            fetch(`${API_URL}/api/categories`),
            fetch(`${API_URL}/api/providers`)
        ]);

        if (!appsResponse.ok || !categoriesResponse.ok || !providersResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        // Get the data from all responses
        availableApps = await appsResponse.json();
        const categories = await categoriesResponse.json();
        const providers = await providersResponse.json();
        
        // Populate filter options
        const categoryFilters = document.getElementById('category-filters');
        const providerFilters = document.getElementById('provider-filters');
        
        if (categoryFilters && providerFilters) {
            categoryFilters.innerHTML = '';
            providerFilters.innerHTML = '';
            
            // Add category and provider options
            categories.forEach(category => {
                categoryFilters.appendChild(createFilterTag(category, category, 'category'));
            });
            
            providers.forEach(provider => {
                providerFilters.appendChild(createFilterTag(provider, provider, 'provider'));
            });
        }
        
        // Initial display of all apps
        displayAvailableApps(availableApps);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function createFilterTag(value, text, type) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.textContent = text;
    tag.dataset.value = value;
    tag.dataset.type = type;
    
    tag.addEventListener('click', () => {
        const allTagsOfType = document.querySelectorAll(`.filter-tag[data-type="${type}"]`);
        const wasActive = tag.classList.contains('active');
        
        // Remove active class from all tags of the same type
        allTagsOfType.forEach(t => t.classList.remove('active'));
        
        // If the tag wasn't active before, make it active
        // If it was active, leave all inactive (showing all)
        if (!wasActive) {
            tag.classList.add('active');
        }
        
        // Filter apps
        filterApps();
    });
    
    return tag;
}

function filterApps() {
    const selectedCategory = document.querySelector('.filter-tag[data-type="category"].active')?.dataset.value;
    const selectedProvider = document.querySelector('.filter-tag[data-type="provider"].active')?.dataset.value;
    
    console.log('Filtering apps with:', { selectedCategory, selectedProvider });
    
    const filteredApps = availableApps.filter(app => {
        // If no category is selected, show all categories
        const categoryMatch = !selectedCategory || (app.categories && app.categories.includes(selectedCategory));
        // If no provider is selected, show all providers
        const providerMatch = !selectedProvider || (app.providers && app.providers.includes(selectedProvider));
        
        return categoryMatch && providerMatch;
    });
    
    displayAvailableApps(filteredApps);
}

function displayAvailableApps(apps) {
    const appGrid = document.getElementById('appGrid');
    if (!appGrid) {
        console.error('App grid not found');
        return;
    }
    
    console.log('Displaying apps:', apps);
    appGrid.innerHTML = '';
    
    apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'app-card';
        if (selectedApps.some(selected => selected.title === app.title)) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="app-content">
                <h3>${app.title}</h3>
                <p>${app.description}</p>
            </div>
        `;
        
        card.addEventListener('click', () => toggleAppSelection(card, app));
        appGrid.appendChild(card);
    });
}

function openAppSelector() {
    const modal = document.getElementById('appSelectorModal');
    if (modal) {
        modal.style.display = 'block';
        // Load apps if not already loaded
        if (availableApps.length === 0) {
            loadAvailableApps();
        } else {
            displayAvailableApps(availableApps);
        }
    }
}

function editAppIcon(index) {
    const app = selectedApps[index];
    const icons = [
        // Common UI Icons
        'fas fa-home',
        'fas fa-cog',
        'fas fa-user',
        'fas fa-users',
        'fas fa-bell',
        'fas fa-search',
        'fas fa-star',
        'fas fa-heart',
        
        // Communication
        'fas fa-envelope',
        'fas fa-comment',
        'fas fa-comments',
        'fas fa-phone',
        'fas fa-video',
        'fas fa-share',
        'fas fa-paper-plane',
        'fas fa-inbox',
        
        // Content & Files
        'fas fa-file',
        'fas fa-file-alt',
        'fas fa-folder',
        'fas fa-image',
        'fas fa-film',
        'fas fa-music',
        'fas fa-book',
        'fas fa-bookmark',
        
        // Business & Analytics
        'fas fa-chart-bar',
        'fas fa-chart-line',
        'fas fa-chart-pie',
        'fas fa-briefcase',
        'fas fa-calculator',
        'fas fa-wallet',
        'fas fa-dollar-sign',
        'fas fa-euro-sign',
        
        // Time & Calendar
        'fas fa-calendar',
        'fas fa-clock',
        'fas fa-hourglass',
        'fas fa-stopwatch',
        'fas fa-history',
        'fas fa-calendar-alt',
        'fas fa-bell-slash',
        'fas fa-alarm-clock',
        
        // Tools & Settings
        'fas fa-tools',
        'fas fa-wrench',
        'fas fa-sliders-h',
        'fas fa-magic',
        'fas fa-key',
        'fas fa-lock',
        'fas fa-shield-alt',
        'fas fa-database',
        
        // Navigation & Location
        'fas fa-map',
        'fas fa-compass',
        'fas fa-location-arrow',
        'fas fa-globe',
        'fas fa-map-marker-alt',
        'fas fa-directions',
        'fas fa-road',
        'fas fa-car',
        
        // Social & Collaboration
        'fas fa-thumbs-up',
        'fas fa-handshake',
        'fas fa-trophy',
        'fas fa-medal',
        'fas fa-crown',
        'fas fa-gift',
        'fas fa-award',
        'fas fa-certificate',
        
        // Misc Apps
        'fas fa-shopping-cart',
        'fas fa-store',
        'fas fa-camera',
        'fas fa-gamepad',
        'fas fa-puzzle-piece',
        'fas fa-paint-brush',
        'fas fa-palette',
        'fas fa-cube'
    ];
    
    // Create and show icon selector modal
    const modal = document.createElement('div');
    modal.className = 'modal icon-selector-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Select Icon</h3>
            <div class="icon-grid">
                ${icons.map(icon => `
                    <div class="icon-option ${icon === app.icon ? 'selected' : ''}" data-icon="${icon}">
                        <i class="${icon}"></i>
                    </div>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="button" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="button primary" onclick="saveIcon(${index}, this)">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Add click handlers for icon selection
    modal.querySelectorAll('.icon-option').forEach(option => {
        option.addEventListener('click', () => {
            modal.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}

function saveIcon(index, button) {
    const modal = button.closest('.modal');
    const selectedIcon = modal.querySelector('.icon-option.selected');
    if (selectedIcon) {
        selectedApps[index].icon = selectedIcon.dataset.icon;
        updateSelectedAppsList();
    }
    modal.remove();
}

document.addEventListener('DOMContentLoaded', function() {
    // Set up logo upload functionality
    const logoPreview = document.querySelector('.logo-preview');
    const logoInput = document.getElementById('logoInput');
    
    if (logoInput && logoPreview) {
        logoInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                handleLogoFile(file);
            }
        });
        
        // Set up drag and drop for logo
        logoPreview.addEventListener('dragover', function(event) {
            event.preventDefault();
            event.stopPropagation();
            this.classList.add('dragging');
        });
        
        logoPreview.addEventListener('dragleave', function(event) {
            event.preventDefault();
            event.stopPropagation();
            this.classList.remove('dragging');
        });
        
        logoPreview.addEventListener('drop', function(event) {
            event.preventDefault();
            event.stopPropagation();
            this.classList.remove('dragging');
            
            const file = event.dataTransfer.files[0];
            if (file) {
                handleLogoFile(file);
            }
        });
    }
    
    // Set up add app button
    const addAppBtn = document.getElementById('addAppBtn');
    if (addAppBtn) {
        addAppBtn.addEventListener('click', openAppSelector);
    }
    
    // Set up publish button
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', publishPreview);
    }
    
    // Update time immediately and then every minute
    updatePreviewTime();
    setInterval(updatePreviewTime, 60000);
});

function handleLogoFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        logoPreview.style.backgroundImage = `url(${e.target.result})`;
        logoPreview.classList.add('has-image');
        previewLogo.src = e.target.result;
        previewLogo.style.display = 'block';
        defaultAppName.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function updatePreviewTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.querySelector('.status-bar .time').textContent = `${hours}:${minutes}`;
}

async function publishPreview() {
    try {
        const appName = document.getElementById('appNameInput').value;
        if (!appName) {
            alert('Please enter an app name');
            return;
        }

        const previewLogo = document.getElementById('previewLogo');
        let logoData = '';
        if (previewLogo) {
            logoData = previewLogo.src;
            // Extract just the base64 data from url("data:image/...")
            if (logoData) {
                logoData = logoData.replace(/^url\("(.+)"\)$/, '$1');
            }
        }

        // Get the preview HTML content
        const previewContent = document.querySelector('.preview-content');
        if (!previewContent) {
            throw new Error('Preview content not found');
        }

        // Clone the preview content
        const previewClone = previewContent.cloneNode(true);

        // Make sure the mobile app modal is included and properly initialized
        const modalInPreview = previewClone.querySelector('#mobileAppModal');
        if (modalInPreview) {
            modalInPreview.style.display = 'none';
            
            // Pre-render all adaptive cards for each selected app
            const cloneModalBody = modalInPreview.querySelector('#mobileModalBody');
            const cloneModalTitle = modalInPreview.querySelector('#mobileModalTitle');
            
            if (cloneModalBody && cloneModalTitle) {
                // Store all app cards in the modal body
                selectedApps.forEach(app => {
                    if (app.cardJson) {
                        try {
                            // Create a container for this app's card
                            const cardContainer = document.createElement('div');
                            cardContainer.className = 'app-card-container';
                            cardContainer.setAttribute('data-app-id', app._id);
                            cardContainer.style.display = 'none'; // Hide by default
                            
                            // Store the card JSON
                            cardContainer.setAttribute('data-adaptive-card', JSON.stringify(app.cardJson));
                            
                            // Pre-render the card
                            const adaptiveCard = new AdaptiveCards.AdaptiveCard();
                            adaptiveCard.parse(app.cardJson);
                            const renderedCard = adaptiveCard.render();
                            cardContainer.appendChild(renderedCard);
                            
                            // Add to modal body
                            cloneModalBody.appendChild(cardContainer);
                            
                            console.log('Pre-rendered card for app:', app.title);
                        } catch (error) {
                            console.error('Error pre-rendering card for app:', app.title, error);
                        }
                    }
                });

                // Update the click handlers to show/hide appropriate cards
                const appServices = previewClone.querySelectorAll('.app-service');
                appServices.forEach(service => {
                    const appId = service.getAttribute('data-app-id');
                    const app = selectedApps.find(a => a._id === appId);
                    if (app) {
                        service.setAttribute('data-title', app.title);
                    }
                });
            }
        }

        const previewHtml = previewClone.outerHTML;
        console.log('Preview HTML:', {
            length: previewHtml.length,
            hasModal: previewHtml.includes('mobileAppModal'),
            hasAdaptiveCard: previewHtml.includes('data-adaptive-card'),
            modalContent: modalInPreview ? modalInPreview.innerHTML : 'no modal'
        });

        const previewData = {
            appName,
            logo: logoData,
            selectedApps: selectedApps || [],
            timestamp: new Date().toISOString(),
            previewHtml
        };

        console.log('Publishing preview with data:', {
            appName: previewData.appName,
            hasLogo: !!previewData.logo,
            selectedAppsCount: previewData.selectedApps.length,
            timestamp: previewData.timestamp,
            previewHtmlLength: previewHtml.length,
            hasModal: !!modalInPreview,
            apiUrl: `${API_URL}/publish-preview`
        });

        console.log('Full preview data:', previewData);

        const response = await fetch(`${API_URL}/publish-preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(previewData)
        });

        console.log('Server response status:', response.status);

        if (!response.ok) {
            const error = await response.json();
            console.error('Server error:', error);
            throw new Error(error.error || 'Failed to publish preview');
        }

        const result = await response.json();
        console.log('Server response:', result);

        const { publicUrl } = result;
        
        // Create a modal to show the public URL
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Preview Published!</h3>
                <p>Your preview is now available at:</p>
                <div class="url-container">
                    <input type="text" value="${publicUrl}" readonly>
                    <button onclick="copyUrl(this)" class="copy-btn">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <button onclick="closePublishModal(this)" class="close-btn">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Open the preview in a new tab
        window.open(publicUrl, '_blank');
    } catch (error) {
        console.error('Error publishing preview:', error);
        alert(error.message || 'Failed to publish preview. Please try again.');
    }
}

document.getElementById('publishBtn').addEventListener('click', publishPreview);

// Close mobile modal when clicking back button
document.querySelector('.back-button').addEventListener('click', function(event) {
    event.preventDefault();
    closeMobileModal();
});

// Close mobile modal when clicking outside
document.getElementById('mobileAppModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeMobileModal();
    }
});
