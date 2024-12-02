// Wait for the AdaptiveCards library to load
if (typeof AdaptiveCards === 'undefined') {
    console.error('AdaptiveCards library not loaded!');
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const appDescription = document.getElementById('appDescription');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const generateBtn = document.getElementById('generateBtn');
    const backgroundColor = document.getElementById('backgroundColor');
    const downloadBtn = document.getElementById('downloadBtn');
    const microApp = document.getElementById('microApp');
    const appPreview = document.getElementById('appPreview');
    const adaptiveCardContainer = document.getElementById('adaptiveCardContainer');
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const colorPreview = document.getElementById('colorPreview');
    const errorDisplay = document.getElementById('errorDisplay');
    const shareBtn = document.getElementById('shareBtn');
    const publishBtn = document.getElementById('publishBtn');

    // Initialize AdaptiveCards
    let adaptiveCard = new AdaptiveCards.AdaptiveCard();
    let currentCard = null;

    // Set default host config
    const hostConfig = {
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        spacing: {
            medium: 16,
            small: 4,
            default: 8,
            large: 24,
            extraLarge: 32,
            padding: 16
        },
        containerStyles: {
            default: {
                foregroundColors: {
                    default: {
                        default: "#000000",
                        subtle: "#767676"
                    }
                },
                backgroundColor: "#FFFFFF"
            },
            emphasis: {
                backgroundColor: "#F9F9F9",
                foregroundColors: {
                    default: {
                        default: "#000000",
                        subtle: "#767676"
                    }
                }
            }
        },
        actions: {
            maxActions: 5,
            spacing: "default",
            buttonSpacing: 8,
            showCard: {
                actionMode: "inline",
                inlineTopMargin: 8
            },
            actionsOrientation: "horizontal",
            actionAlignment: "stretch",
            actionStyle: "default",
            actions: {
                default: {
                    backgroundColor: "#111111",
                    textColor: "#FFFFFF",
                    borderRadius: "2px",
                    borderColor: "transparent",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "500",
                    hover: {
                        backgroundColor: "#333333"
                    }
                }
            }
        },
        inputs: {
            spacing: 10,
            backgroundColor: "#FFFFFF",
            borderColor: "#DDDDDD",
            borderRadius: 4,
            placeholderTextColor: "#767676"
        }
    };

    // Apply host config
    adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(hostConfig);

    // Background color handler
    backgroundColor.addEventListener('input', (e) => {
        const color = e.target.value;
        microApp.style.backgroundColor = color;
        colorPreview.textContent = color.toUpperCase();
    });

    // Initialize color preview
    colorPreview.textContent = backgroundColor.value.toUpperCase();

    // Generate button handler
    generateBtn.addEventListener('click', async () => {
        const description = appDescription.value.trim();
        
        if (!description) {
            alert('Please provide a description for the card.');
            return;
        }

        try {
            // Show loading state
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            const card = await generateCardFromDescription(description);
            currentCard = card;
            renderCard(card);
        } catch (error) {
            console.error('Error generating card:', error);
            let errorMessage = 'Error generating card. Please try again.';
            
            if (error.response?.status === 429 || error.message?.includes('rate limit')) {
                errorMessage = 'The AI service is currently at capacity. Please try again in about an hour.';
                // Disable the generate button for a short time to prevent spam
                generateBtn.disabled = true;
                setTimeout(() => {
                    generateBtn.disabled = false;
                }, 10000); // Re-enable after 10 seconds
            }
            
            alert(errorMessage);
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = 'Generate Card';
        }
    });

    async function generateCardFromDescription(description) {
        try {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const API_URL = isLocalhost ? 'http://localhost:3000' : 'https://web-production-72b3.up.railway.app';
            
            console.log('Making request to:', `${API_URL}/generate-card`);
            const response = await fetch(`${API_URL}/generate-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ description })
            });

            const data = await response.json();
            
            if (!response.ok) {
                const error = new Error(data.error || 'Failed to generate card');
                error.response = response;
                error.details = data.details;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    async function generateCard() {
        const description = appDescription.value.trim();
        
        if (!description) {
            showError('Please enter a description for your micro-app.');
            return;
        }

        generateBtn.disabled = true;
        showLoading(true);
        hideError();

        try {
            const response = await fetch('https://web-production-72b3.up.railway.app/generate-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description })
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMessage = data.error || 'Error generating card';
                let retryDelay = 3000; // Default 3 seconds

                if (response.status === 429) {
                    // Rate limit error
                    if (data.retryAfter) {
                        const minutes = Math.ceil(data.retryAfter / 60);
                        errorMessage = `Rate limit exceeded. Please try again in ${minutes} minutes.`;
                        retryDelay = data.retryAfter * 1000;
                    } else {
                        errorMessage = 'Too many requests. Please try again in a few seconds.';
                    }
                    
                    // Disable button temporarily
                    generateBtn.disabled = true;
                    setTimeout(() => {
                        generateBtn.disabled = false;
                    }, retryDelay);
                }

                throw new Error(errorMessage);
            }

            // Clear any previous errors
            hideError();
            
            // Render the card
            adaptiveCard.parse(data);
            const renderedCard = adaptiveCard.render();
            
            const cardContainer = adaptiveCardContainer;
            cardContainer.innerHTML = '';
            cardContainer.appendChild(renderedCard);
            
            // Enable download after successful generation
            enableDownload();
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        } finally {
            showLoading(false);
            if (!generateBtn.dataset.rateLimited) {
                generateBtn.disabled = false;
            }
        }
    }

    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        
        // Auto-hide error after 5 seconds unless it's a rate limit error
        if (!message.includes('rate limit')) {
            setTimeout(() => {
                errorDisplay.style.display = 'none';
            }, 5000);
        }
    }

    function hideError() {
        errorDisplay.style.display = 'none';
    }

    function showLoading(show) {
        if (show) {
            generateBtn.innerHTML = '<span class="spinner"></span> Generating...';
        } else {
            generateBtn.textContent = 'Generate Card';
        }
    }

    // Download functionality
    async function downloadAsPNG() {
        try {
            const card = document.querySelector('#microApp');
            const cardTitle = document.querySelector('#appDescription').value.split('\n')[0] || 'Untitled Micro-App';
            const cardDescription = document.querySelector('#appDescription').value || 'No description provided';
            
            // Generate PNG
            const dataUrl = await domtoimage.toPng(card, {
                quality: 1.0,
                bgcolor: card.style.backgroundColor || '#ffffff',
                style: {
                    transform: 'none'
                },
                scale: 2
            });
            
            // Convert data URL to Blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            // Create form data
            const formData = new FormData();
            formData.append('image', blob, 'card.png');
            formData.append('title', cardTitle);
            formData.append('description', cardDescription);
            formData.append('cardData', JSON.stringify(currentCard));
            
            // Save to backend
            const saveResponse = await fetch('https://web-production-72b3.up.railway.app/save-micro-app', {
                method: 'POST',
                body: formData
            });
            
            if (!saveResponse.ok) {
                throw new Error('Failed to save micro-app');
            }
            
            // Download PNG
            const link = document.createElement('a');
            link.download = 'micro-app.png';
            link.href = dataUrl;
            link.click();
            
            showMessage('Micro-app saved and downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showMessage('Failed to process image. Please try again.', 'error');
        }
    }

    function showMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        document.body.appendChild(messageElement);
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    downloadBtn.addEventListener('click', downloadAsPNG);

    // Download as PNG
    downloadBtn.addEventListener('click', () => {
        domtoimage.toPng(document.getElementById('microApp'))
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = 'micro-app.png';
                link.href = dataUrl;
                link.click();
            })
            .catch((error) => {
                console.error('Error generating PNG:', error);
            });
    });

    // Get Shareable Link
    shareBtn.addEventListener('click', async () => {
        try {
            const dataUrl = await domtoimage.toPng(document.getElementById('microApp'));
            const response = await fetch('http://localhost:3000/upload-image', {
                method: 'POST',
                body: JSON.stringify({ imageData: dataUrl.split(',')[1] }),
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            if (result.success) {
                alert('Shareable link: ' + result.data.url);
            } else {
                alert('Failed to get shareable link.');
            }
        } catch (error) {
            console.error('Error getting shareable link:', error);
        }
    });

    // Publish to Gallery
    publishBtn.addEventListener('click', async () => {
        try {
            const dataUrl = await domtoimage.toPng(document.getElementById('microApp'));
            const response = await fetch('http://localhost:3000/api/publish', {
                method: 'POST',
                body: JSON.stringify({ image: dataUrl.split(',')[1] }),
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            if (result.success) {
                alert('Micro-app published to gallery!');
            } else {
                alert('Failed to publish micro-app.');
            }
        } catch (error) {
            console.error('Error publishing to gallery:', error);
        }
    });

    // Function to render card
    function renderCard(cardJson) {
        try {
            console.log('Rendering card with JSON:', cardJson);
            
            // Create an AdaptiveCard instance
            const adaptiveCard = new AdaptiveCards.AdaptiveCard();
            
            // Set host config
            adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
                fontFamily: "League Spartan, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                spacing: {
                    small: 3,
                    default: 8,
                    medium: 20,
                    large: 30,
                    extraLarge: 40,
                    padding: 10
                },
                separator: {
                    lineThickness: 1,
                    lineColor: "#EEEEEE"
                }
            });

            // Parse the card payload
            adaptiveCard.parse(cardJson);
            
            // Clear the existing card
            adaptiveCardContainer.innerHTML = '';
            
            // Render the card
            const renderedCard = adaptiveCard.render();
            
            // Add the card to the container
            adaptiveCardContainer.appendChild(renderedCard);
            
            console.log('Card rendered successfully');
        } catch (error) {
            console.error('Error rendering card:', error);
            throw new Error('Failed to render card: ' + error.message);
        }
    }
});
