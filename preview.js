// API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://web-production-72b3.up.railway.app';

let selectedApps = [];
let availableApps = [];

// Global functions for modal operations
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

document.addEventListener('DOMContentLoaded', function() {
    // Set up logo upload functionality
    const logoPreview = document.querySelector('.logo-preview');
    const logoInput = document.getElementById('logoInput');
    const previewLogo = document.getElementById('previewLogo');
    const defaultAppName = document.getElementById('defaultAppName');

    // Set up app name input
    const appNameInput = document.getElementById('appNameInput');
    appNameInput.addEventListener('input', function(e) {
        defaultAppName.textContent = e.target.value || 'My App';
    });

    // Handle drag and drop
    logoPreview.addEventListener('dragover', (e) => {
        e.preventDefault();
        logoPreview.classList.add('dragover');
    });

    logoPreview.addEventListener('dragleave', () => {
        logoPreview.classList.remove('dragover');
    });

    logoPreview.addEventListener('drop', (e) => {
        e.preventDefault();
        logoPreview.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleLogoFile(file);
        }
    });
    
    logoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleLogoFile(file);
        }
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

    // Set up add app button
    document.getElementById('addAppBtn').addEventListener('click', openAppSelector);

    // Load available apps from the gallery
    loadAvailableApps();

    // Update preview time
    function updatePreviewTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.querySelector('.status-bar .time').textContent = `${hours}:${minutes}`;
    }

    // Update time immediately and then every minute
    updatePreviewTime();
    setInterval(updatePreviewTime, 60000);

    // Set up publish button
    document.getElementById('publishBtn').addEventListener('click', publishPreview);

    async function publishPreview() {
        try {
            const previewData = {
                appName: document.getElementById('appNameInput').value,
                logo: document.querySelector('.logo-preview').style.backgroundImage,
                selectedApps: selectedApps,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${API_URL}/publish-preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(previewData)
            });

            if (!response.ok) {
                throw new Error('Failed to publish preview');
            }

            const { publicUrl } = await response.json();
            
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
        } catch (error) {
            console.error('Error publishing preview:', error);
            alert('Failed to publish preview. Please try again.');
        }
    }

    async function loadAvailableApps() {
        try {
            const response = await fetch(`${API_URL}/api/gallery`);
            if (!response.ok) {
                throw new Error('Failed to fetch micro-apps');
            }
            availableApps = await response.json();
            console.log('Loaded apps:', availableApps); // Debug log
        } catch (error) {
            console.error('Error loading available apps:', error);
            availableApps = [];
        }
    }

    function openAppSelector() {
        const modal = document.getElementById('appSelectorModal');
        const appGrid = document.getElementById('appGrid');
        
        // Clear previous content
        appGrid.innerHTML = '';
        
        // Add available apps to the grid
        availableApps.forEach(app => {
            const card = document.createElement('div');
            card.className = 'app-card';
            if (selectedApps.some(selected => selected._id === app._id)) {
                card.classList.add('selected');
            }
            
            card.innerHTML = `
                <h3>${app.title}</h3>
                <p>${app.description.substring(0, 50)}...</p>
            `;
            
            card.addEventListener('click', () => toggleAppSelection(card, app));
            appGrid.appendChild(card);
        });
        
        modal.style.display = 'block';
    }

    function toggleAppSelection(card, app) {
        card.classList.toggle('selected');
    }

    function confirmAppSelection() {
        const selectedCards = document.querySelectorAll('.app-card.selected');
        selectedApps = Array.from(selectedCards).map(card => {
            const appTitle = card.querySelector('h3').textContent;
            const app = availableApps.find(app => app.title === appTitle);
            console.log('Selected app:', app); // Debug log
            return app;
        });
        
        updateSelectedAppsList();
        closeAppSelector();
    }

    function closeAppSelector() {
        const modal = document.getElementById('appSelectorModal');
        modal.style.display = 'none';
    }

    function updateSelectedAppsList() {
        const selectedAppsList = document.getElementById('selectedAppsList');
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

    function updatePreview() {
        const appServices = document.getElementById('appServices');
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
        
        console.log('Opening modal for app:', app); // Debug log
        
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
        
        // Hide modal and show app services with animation
        modal.style.display = 'none';
        appServices.style.display = 'grid';
    }

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
});
