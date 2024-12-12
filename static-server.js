const express = require('express');
const path = require('path');
const fs = require('fs').promises;
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
app.get('/published-preview/:id', async (req, res) => {
    const previewId = req.params.id;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Published Preview - Micro App Generator</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" href="../styles.css">
    <script src="https://unpkg.com/adaptivecards@2.11.2/dist/adaptivecards.min.js"></script>
</head>
<body>
    <nav class="main-navigation">
        <div class="nav-logo">
            <img src="https://res.cloudinary.com/vizir2/image/upload/v1732533463/Companion-icon_rw3nk3.png" alt="Logo" class="logo">
            <span class="nav-title">LumApps Micro-apps</span>
        </div>
        <div class="nav-links">
            <a href="../index.html" class="nav-link">Generator</a>
            <a href="../gallery.html" class="nav-link">Gallery</a>
            <a href="../preview.html" class="nav-link">Preview</a>
        </div>
    </nav>
    <div id="preview-container">
        <div id="adaptivecard-container"></div>
    </div>

    <script>
        const API_URL = 'https://micro-app-generator-server.onrender.com';
        const previewId = '${previewId}';
        
        async function loadPreview() {
            try {
                const apiUrl = API_URL + '/preview/' + previewId;
                console.log('Fetching from:', apiUrl);
                
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch preview data');
                }
                
                const data = await response.json();
                if (!data || !data.cardJson) {
                    throw new Error('Invalid preview data');
                }

                // Parse the JSON string into an object
                const cardData = JSON.parse(data.cardJson);

                // Create an AdaptiveCard instance
                var adaptiveCard = new AdaptiveCards.AdaptiveCard();

                // Set its hostConfig property unless you want to use the default Host Config
                // adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({...});

                // Parse the card payload
                adaptiveCard.parse(cardData);

                // Render the card to an HTML element:
                var renderedCard = adaptiveCard.render();

                // Clear the container and append the rendered card
                const container = document.getElementById('adaptivecard-container');
                container.innerHTML = '';
                container.appendChild(renderedCard);
            } catch (error) {
                console.error('Error loading preview:', error);
                document.getElementById('adaptivecard-container').innerHTML = 
                    '<p class="error-message">Error loading preview. Please try again later.</p>';
            }
        }

        // Load the preview when the page loads
        window.addEventListener('DOMContentLoaded', loadPreview);
    </script>
</body>
</html>`;

    try {
        // Ensure the published-preview directory exists
        const previewDir = path.join(__dirname, 'published-preview');
        await fs.mkdir(previewDir, { recursive: true });

        // Write the HTML file
        const filePath = path.join(previewDir, `${previewId}.html`);
        await fs.writeFile(filePath, html);
        console.log(`Preview file written to: ${filePath}`);

        res.send(html);
    } catch (error) {
        console.error('Error writing preview file:', error);
        res.status(500).send('Error generating preview');
    }
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
