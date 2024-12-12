const express = require('express');
const path = require('path');
const app = express();

console.log('Starting static server...');

// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Serve static files from the root directory with proper content types
app.use(express.static('./', {
    setHeaders: (res, path) => {
        console.log('Serving static file:', path);
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));

// Handle published preview routes
app.get('/published-preview/:id', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Published Preview - Micro App Generator</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" href="/styles.css">
    <script src="https://unpkg.com/adaptivecards@2.11.2/dist/adaptivecards.min.js"></script>
</head>
<body>
    <nav class="main-navigation">
        <div class="nav-logo">
            <img src="https://res.cloudinary.com/vizir2/image/upload/v1732533463/Companion-icon_rw3nk3.png" alt="Logo" class="logo">
            <span class="nav-title">LumApps Micro-apps</span>
        </div>
        <div class="nav-links">
            <a href="/index.html" class="nav-link">Generator</a>
            <a href="/gallery.html" class="nav-link">Gallery</a>
            <a href="/preview.html" class="nav-link">Preview</a>
        </div>
    </nav>

        <div class="preview-panel">
            <div id="previewFrame">
                <div class="status-bar">
                    <span class="time">12:30</span>
                    <div class="status-icons">
                        <i class="fas fa-signal"></i>
                        <i class="fas fa-wifi"></i>
                        <i class="fas fa-battery-full"></i>
                    </div>
                </div>
                <div class="preview-header">
                    <img id="previewLogo" src="/images/companion.svg" alt="App Logo" class="preview-logo">
                    <h3 id="previewTitle" class="preview-title"></h3>
                </div>
                <div class="preview-content">
                    <div class="preview-title">
                        <h2>Shortcuts</h2>
                    </div>
                    <div id="previewAppsList" class="previewAppsList">
                        <!-- Selected apps will be displayed here -->
                    </div>
                    <div class="mobile-app-modal" id="mobileAppModal">
                        <div class="mobile-modal-content">
                            <div class="mobile-modal-header">
                                <button class="back-button" onclick="closeMobileModal()">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <h3 id="mobileModalTitle"></h3>
                            </div>
                            <div class="modal-body">
                                <div id="adaptiveCardContainer"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>



    <script>
        // Get the preview ID from the URL
        const pathParts = window.location.pathname.split('/');
        const previewId = pathParts[pathParts.length - 1];
        
        // Always use port 3000 for API calls
        const API_URL = 'http://localhost:3000';

        // Function to format date
        function formatDate(dateString) {
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            };
            return new Date(dateString).toLocaleDateString('en-US', options);
        }

        // Function to update the status bar time
        function updateStatusBarTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            document.querySelector('.status-time').textContent = timeString;
        }

        // Function to open app in modal
        function openAppPreview(app) {
            console.log('Opening app preview:', app);
            const adaptiveCard = new AdaptiveCards.AdaptiveCard();
            const appsList = document.getElementById('previewAppsList');
            const modal = document.getElementById('mobileAppModal');
            const title = document.getElementById('mobileModalTitle');
            const container = document.getElementById('adaptiveCardContainer');
            
            try {
                if (!app.cardJson) {
                    throw new Error('No card JSON found for this app');
                }
                
                // Set the title
                title.textContent = app.title;
                
                // Parse and render the card
                adaptiveCard.parse(app.cardJson);
                const renderedCard = adaptiveCard.render();
                
                container.innerHTML = '';
                container.appendChild(renderedCard);
                
                // Hide apps list and show modal
                appsList.style.display = 'none';
                modal.style.display = 'block';
            } catch (error) {
                console.error('Error rendering adaptive card:', error);
                container.innerHTML = '<p>Error rendering card: ' + error.message + '</p>';
                // Still show the modal with the error
                appsList.style.display = 'none';
                modal.style.display = 'block';
            }
        }

        // Function to close the modal
        function closeMobileModal() {
            const modal = document.getElementById('mobileAppModal');
            const appsList = document.getElementById('previewAppsList');
            modal.style.display = 'none';
            appsList.style.display = 'grid';
        }

        // Load and display the preview
        async function loadPreview() {
            try {
                const apiUrl = API_URL + '/preview/' + previewId;
                console.log('Fetching from:', apiUrl);
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }

                const data = await response.json();
                console.log('Preview data:', JSON.stringify(data, null, 2));

                // Update the title in both places
                const previewTitle = document.getElementById('previewTitle');
                const mobileModalTitle = document.getElementById('mobileModalTitle');
                const title = data.title || data.appName || 'My App';
                if (previewTitle) previewTitle.textContent = title;
                if (mobileModalTitle) mobileModalTitle.textContent = title;

                // Update the logo if it exists
                const previewLogoImg = document.getElementById('previewLogo');
                if (previewLogoImg) {
                    if (data.logo && data.logo.startsWith('data:image/')) {
                        previewLogoImg.src = data.logo;
                        previewLogoImg.style.display = 'block';
                    } else if (data.logo) {
                        // If it's a URL, use it directly
                        previewLogoImg.src = data.logo;
                        previewLogoImg.style.display = 'block';
                    } else {
                        // Fallback to default logo
                        previewLogoImg.src = '/images/companion.svg';
                        previewLogoImg.style.display = 'block';
                    }
                }

                // Display selected apps
                const selectedAppsList = document.getElementById('previewAppsList');
                if (!selectedAppsList) {
                    console.error('Could not find previewAppsList element');
                    return;
                }
                selectedAppsList.innerHTML = '';

                if (data.selectedApps && Array.isArray(data.selectedApps)) {
                    console.log('Selected apps:', JSON.stringify(data.selectedApps, null, 2));
                    data.selectedApps.forEach((app, index) => {
                        console.log('Processing app:', app);
                        const appElement = document.createElement('div');
                        appElement.className = 'app-service';
                        const icon = app.icon || 'fas fa-cube';
                        const title = app.title || app.appName || app.name || 'Unnamed App';
                        appElement.innerHTML = 
                            '<div class="service-icon">' +
                                '<i class="' + icon + '"></i>' +
                            '</div>' +
                            '<div class="service-info">' +
                                '<h4>' + title + '</h4>' +
                            '</div>';
                        
                        // Add click handler to open modal
                        appElement.onclick = () => openAppPreview(app);
                        selectedAppsList.appendChild(appElement);
                        console.log('Added app element:', title);
                    });
                } else {
                    console.log('No apps found in data:', data);
                }

            } catch (error) {
                console.error('Error loading preview:', error);
                const previewTitle = document.getElementById('previewTitle');
                if (previewTitle) {
                    previewTitle.textContent = 'Error loading preview';
                }
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadPreview();
            updateStatusBarTime();
            // Update time every minute
            setInterval(updateStatusBarTime, 60000);
        });
    </script>
</body>
</html>`;

    res.send(html);
});

// Handle root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// All other routes should 404 to avoid conflicting with the API server
app.get('*', (req, res) => {
    res.status(404).send('Not found');
});

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Static file server running on http://localhost:${PORT}`);
});
