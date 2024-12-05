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
            showMessage('Generating PNG...', 'info');
            const dataUrl = await domtoimage.toPng(microApp);
            const link = document.createElement('a');
            link.download = 'micro-app.png';
            link.href = dataUrl;
            link.click();
            showMessage('PNG downloaded successfully! ', 'success');
        } catch (error) {
            console.error('Error generating PNG:', error);
            showMessage('Failed to generate PNG', 'error');
        }
    }

    // Get shareable link functionality
    async function getShareableLink() {
        try {
            showMessage('Generating shareable link...', 'info');
            const dataUrl = await domtoimage.toPng(microApp);
            const base64Data = dataUrl.split(',')[1];

            const response = await fetch('http://localhost:3000/upload-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageData: base64Data })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload image');
            }
            
            if (result.success) {
                // Create and show modal
                const modal = document.createElement('div');
                modal.className = 'modal link-modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2>Shareable Link</h2>
                        <div class="url-container">
                            <input type="text" value="${result.data.url}" readonly>
                            <button id="copyLinkBtn">
                                <i class="fas fa-copy"></i>
                                Copy
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                const closeBtn = modal.querySelector('.close');
                const copyBtn = modal.querySelector('#copyLinkBtn');
                const input = modal.querySelector('input');
                
                // Close button handler
                closeBtn.onclick = () => {
                    document.body.removeChild(modal);
                };
                
                // Copy button handler
                copyBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(result.data.url);
                        showMessage('Link copied to clipboard! ', 'success');
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        }, 2000);
                    } catch (err) {
                        // Fallback for older browsers
                        input.select();
                        document.execCommand('copy');
                        showMessage('Link copied to clipboard! ', 'success');
                    }
                };
                
                // Click outside to close
                modal.onclick = (event) => {
                    if (event.target === modal) {
                        document.body.removeChild(modal);
                    }
                };
                
                modal.style.display = 'flex';
                input.select(); // Select the URL for easy copying
                showMessage('Link generated successfully! ', 'success');
            } else {
                throw new Error(result.error || 'Failed to generate link');
            }
        } catch (error) {
            console.error('Error getting shareable link:', error);
            showMessage(error.message || 'Failed to generate shareable link', 'error');
        }
    }

    // Publish to gallery functionality
    async function publishToGallery() {
        try {
            showMessage('Publishing to gallery...', 'info');
            const dataUrl = await domtoimage.toPng(microApp);
            const base64Data = dataUrl.split(',')[1];

            const response = await fetch('http://localhost:3000/api/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    imageData: base64Data,
                    description: appDescription.value
                })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessage('Published to gallery successfully! ', 'success');
            } else {
                throw new Error(result.error || 'Failed to publish to gallery');
            }
        } catch (error) {
            console.error('Error publishing to gallery:', error);
            showMessage(error.message || 'Failed to publish to gallery', 'error');
        }
    }

    // Get JSON functionality
    function getCardJSON() {
        if (!currentCard) {
            showMessage('No card generated yet', 'error');
            return;
        }

        const jsonContent = document.getElementById('jsonContent');
        jsonContent.textContent = JSON.stringify(currentCard, null, 2);
        jsonModal.style.display = 'flex';

        const closeBtn = jsonModal.querySelector('.close');
        const copyBtn = jsonModal.querySelector('#copyJsonBtn');
        
        closeBtn.onclick = () => {
            jsonModal.style.display = 'none';
        };
        
        copyBtn.onclick = () => {
            try {
                navigator.clipboard.writeText(JSON.stringify(currentCard, null, 2))
                    .then(() => {
                        showMessage('JSON copied to clipboard! ', 'success');
                    })
                    .catch(() => {
                        // Fallback for older browsers
                        const tempTextArea = document.createElement('textarea');
                        tempTextArea.value = JSON.stringify(currentCard, null, 2);
                        document.body.appendChild(tempTextArea);
                        tempTextArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(tempTextArea);
                        showMessage('JSON copied to clipboard! ', 'success');
                    });
            } catch (error) {
                console.error('Error copying to clipboard:', error);
                showMessage('Failed to copy JSON', 'error');
            }
        };
    }

    // Create JSON Modal
    const jsonModal = document.createElement('div');
    jsonModal.className = 'modal';
    jsonModal.style.display = 'none';
    jsonModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Card JSON</h2>
            <pre id="jsonContent"></pre>
            <div class="modal-footer">
                <button id="copyJsonBtn">
                    <i class="fas fa-copy"></i>
                    Copy to Clipboard
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(jsonModal);

    // Get JSON button functionality
    const getJsonBtn = document.createElement('button');
    getJsonBtn.id = 'getJsonBtn';
    getJsonBtn.className = 'action-button';
    getJsonBtn.innerHTML = '<i class="fas fa-code"></i> Get Card JSON';
    document.querySelector('.actions-group').appendChild(getJsonBtn);

    // Add event listeners
    downloadBtn.addEventListener('click', downloadAsPNG);
    shareBtn.addEventListener('click', getShareableLink);
    publishBtn.addEventListener('click', publishToGallery);
    getJsonBtn.addEventListener('click', getCardJSON);

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target.className === 'modal') {
            event.target.style.display = 'none';
        }
    };

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

    function showMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        document.body.appendChild(messageElement);
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }
});
