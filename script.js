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
    const backgroundImage = document.getElementById('backgroundImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const microApp = document.getElementById('microApp');
    const appPreview = document.getElementById('appPreview');
    const adaptiveCardContainer = document.getElementById('adaptiveCardContainer');
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const colorPreview = document.getElementById('colorPreview');
    const dropZone = document.getElementById('dropZone');

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

    // Theme toggle functionality
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeStyles(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeStyles(newTheme);
    });

    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                htmlElement.setAttribute('data-theme', newTheme);
                themeToggle.checked = e.matches;
                updateThemeStyles(newTheme);
            }
        });
    }

    function updateThemeStyles(theme) {
        if (!microApp.style.backgroundImage || microApp.style.backgroundImage === 'none') {
            microApp.style.backgroundColor = theme === 'dark' ? '#25262b' : '#ffffff';
        }

        const updatedConfig = {
            ...hostConfig,
            containerStyles: {
                ...hostConfig.containerStyles,
                default: {
                    foregroundColors: {
                        default: {
                            default: theme === 'dark' ? "#FFFFFF" : "#000000",
                            subtle: "#767676"
                        }
                    },
                    backgroundColor: "#FFFFFF"
                }
            },
            inputs: {
                ...hostConfig.inputs,
                backgroundColor: "#FFFFFF",
                borderColor: theme === 'dark' ? "#666666" : "#DDDDDD"
            },
            actions: {
                ...hostConfig.actions,
                actions: {
                    default: {
                        backgroundColor: theme === 'dark' ? "#FFFFFF" : "#111111",
                        textColor: theme === 'dark' ? "#111111" : "#FFFFFF",
                        borderRadius: "2px",
                        borderColor: "transparent",
                        padding: "8px 16px",
                        fontSize: "14px",
                        fontWeight: "500",
                        hover: {
                            backgroundColor: theme === 'dark' ? "#EEEEEE" : "#333333"
                        }
                    }
                }
            }
        };

        adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(updatedConfig);
        if (currentCard) {
            renderCard(currentCard);
        }
    }

    // Background color handler
    backgroundColor.addEventListener('input', (e) => {
        const color = e.target.value;
        microApp.style.backgroundColor = color;
        colorPreview.textContent = color.toUpperCase();
    });

    // Initialize color preview
    colorPreview.textContent = backgroundColor.value.toUpperCase();

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    backgroundImage.addEventListener('change', (e) => handleFiles(e.target.files));

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                microApp.style.backgroundImage = `url(${e.target.result})`;
                microApp.style.backgroundSize = 'cover';
                microApp.style.backgroundPosition = 'center';
                dropZone.classList.add('has-image');
                dropZone.querySelector('.drop-zone__text').textContent = files[0].name;
            };
            reader.readAsDataURL(files[0]);
        }
    }

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

    // Function to generate card from description
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

    // Download functionality
    downloadBtn.addEventListener('click', function() {
        const microAppElement = document.getElementById('microApp');
        const options = {
            quality: 1.0,
            bgcolor: microAppElement.style.backgroundColor || '#ffffff',
            style: {
                transform: 'none'
            },
            scale: 2  // Improve quality with 2x scaling
        };

        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Processing...';

        domtoimage.toPng(microAppElement, options)
            .then(function(dataUrl) {
                // Download the image
                const link = document.createElement('a');
                link.download = 'adaptive-card.png';
                link.href = dataUrl;
                link.click();

                // Convert to blob for upload
                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        // Upload to ImgBB
                        const formData = new FormData();
                        formData.append('image', blob, 'adaptive-card.png');
                        
                        return fetch('https://api.imgbb.com/1/upload?key=1242fb32ef495dd0e14891ef8ccbb326', {
                            method: 'POST',
                            body: formData
                        });
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const publicUrl = data.data.url;
                            const displayUrl = document.createElement('div');
                            displayUrl.className = 'url-display';
                            displayUrl.innerHTML = `
                                <div class="modal">
                                    <h3>Image Hosted Successfully!</h3>
                                    <p>Public URL:</p>
                                    <input type="text" value="${publicUrl}" readonly onclick="this.select()">
                                    <button onclick="navigator.clipboard.writeText('${publicUrl}').then(() => alert('URL copied!'))">
                                        Copy URL
                                    </button>
                                    <button onclick="this.closest('.url-display').remove()">Close</button>
                                </div>
                            `;
                            document.body.appendChild(displayUrl);
                        }
                    })
                    .catch(error => {
                        console.error('Error uploading to ImgBB:', error);
                        alert('Image downloaded but hosting failed');
                    })
                    .finally(() => {
                        downloadBtn.disabled = false;
                        downloadBtn.textContent = 'Download & Host';
                    });
            })
            .catch(function(error) {
                console.error('Error generating image:', error);
                alert('Failed to generate image');
                downloadBtn.disabled = false;
                downloadBtn.textContent = 'Download & Host';
            });
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
