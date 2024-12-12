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
    const publishModal = document.getElementById('publishModal');
    const publishNowBtn = document.getElementById('publishNowBtn');
    const categoryInput = document.getElementById('categoryInput');
    const providersInput = document.getElementById('providersInput');
    const selectedCategories = document.getElementById('selectedCategories');
    const selectedProviders = document.getElementById('selectedProviders');

    // Ensure modals are hidden by default
    if (publishModal) {
        publishModal.style.display = 'none';
    }

    // Initialize AdaptiveCards
    let adaptiveCard = new AdaptiveCards.AdaptiveCard();
    let currentCard = null;

    // Function to create host config with fixed button color
    function createHostConfig() {
        return new AdaptiveCards.HostConfig({
            fontFamily: "'TT Commons', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
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
                        backgroundColor: "#4752c4",
                        textColor: "#FFFFFF",
                        borderRadius: "4px",
                        borderColor: "transparent",
                        padding: "8px 16px",
                        fontSize: "14px",
                        fontWeight: "500",
                        hover: {
                            backgroundColor: "#4752c4"
                        }
                    }
                }
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
            }
        });
    }

    // Set default host config
    const hostConfig = {
        fontFamily: "'TT Commons', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
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

    // API URL based on environment
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000'
        : 'https://web-production-72b3.up.railway.app';

    // Generate button handler
    generateBtn.addEventListener('click', async () => {
        const description = appDescription.value.trim();
        const emptyState = document.querySelector('.empty-state');
        
        if (!description) {
            showMessage('Please provide a description for the card.', 'error');
            return;
        }

        try {
            // Show loading state
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            // Hide empty state message
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            
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
            
            showMessage(errorMessage, 'error');
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = 'Generate Card';
        }
    });

    async function generateCardFromDescription(description) {
        try {
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
        try {
            const description = document.getElementById('appDescription').value;
            if (!description) {
                showError('Please enter a description');
                return;
            }

            showLoading(true);
            hideError();

            const response = await fetch(`${API_URL}/generate-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: description,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate card');
            }

            const data = await response.json();
            
            // Store the current card data (data is already the card)
            currentCard = data;
            
            // Render the card
            renderCard(data);
            
            showLoading(false);
        } catch (error) {
            console.error('Error generating card:', error);
            showError(error.message);
            showLoading(false);
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

            const response = await fetch(`${API_URL}/upload-image`, {
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
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        }, 2000);
                    } catch (err) {
                        // Fallback for older browsers
                        input.select();
                        document.execCommand('copy');
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        }, 2000);
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
            const title = document.getElementById('publishTitle').value;
            const description = document.getElementById('publishDescription').value;
            const categories = getSelectedTags('categoryTags');
            const providers = getSelectedTags('providerTags');

            // Validate inputs
            if (!title) {
                showError('Please enter a title');
                return;
            }
            if (!description) {
                showError('Please enter a description');
                return;
            }
            if (!categories || categories.length === 0) {
                showError('Please select at least one category');
                return;
            }
            if (!providers || providers.length === 0) {
                showError('Please select at least one provider');
                return;
            }
            if (!currentCard) {
                showError('Please generate a card first');
                return;
            }

            // Show loading state
            showLoading(true);

            // Convert card to image using html2canvas
            const cardElement = document.getElementById('microApp');
            try {
                console.log('Converting card to image...');
                const canvas = await html2canvas(cardElement, {
                    useCORS: true,
                    scale: 2, // Higher quality
                    backgroundColor: null
                });
                const imageData = canvas.toDataURL('image/png');
                console.log('Image generated successfully:', imageData.substring(0, 100) + '...');

                const requestBody = {
                    title,
                    description,
                    categories,
                    providers,
                    cardJson: currentCard,
                    image: imageData
                };
                
                console.log('Sending request with body:', {
                    ...requestBody,
                    image: requestBody.image.substring(0, 100) + '...',
                    cardJson: JSON.stringify(requestBody.cardJson).substring(0, 100) + '...'
                });

                const response = await fetch(`${API_URL}/api/publish`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to publish card');
                }

                showLoading(false);
                const data = await response.json();
                showMessage('Successfully published to gallery! ', 'success');
                resetModalState();
                publishModal.style.display = 'none';
            } catch (imageError) {
                console.error('Error generating image:', imageError);
                showError('Failed to generate card image. Please try again.');
                showLoading(false);
            }

        } catch (error) {
            showLoading(false);
            console.error('Error publishing to gallery:', error);
            showError(error.message);
        }
    }

    function getSelectedTags(tagContainerId) {
        const selectedTags = [];
        const tagContainer = document.getElementById(tagContainerId);
        const tagButtons = tagContainer.querySelectorAll('.tag-btn.selected');
        tagButtons.forEach(button => {
            selectedTags.push(button.getAttribute('data-tag'));
        });
        return selectedTags;
    }

    // Initialize modal functionality
    document.querySelectorAll('.modal-close, .close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Initialize copy button functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const textToCopy = this.closest('.modal').querySelector('input, textarea')?.value;
            if (textToCopy) {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        this.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    }, 2000);
                } catch (err) {
                    // Fallback for older browsers
                    const input = this.closest('.modal').querySelector('input, textarea');
                    input.select();
                    document.execCommand('copy');
                }
            }
        });
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }

    // Add click event for publish button if it exists
    if (publishBtn) {
        publishBtn.addEventListener('click', openPublishModal);
    }

    // Initialize tag containers
    function initializeTagSystem() {
        const tagCategories = new Set();
        const tagProviders = new Set();

        // Helper function to create a tag element
        function createTag(text, type) {
            const tag = document.createElement('span');
            tag.classList.add('selected-tag');
            tag.textContent = text;
            const removeBtn = document.createElement('span');
            removeBtn.classList.add('remove-tag');
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = () => {
                tag.remove();
                if (type === 'category') {
                    tagCategories.delete(text);
                } else {
                    tagProviders.delete(text);
                }
            };
            tag.appendChild(removeBtn);
            return tag;
        }

        // Handle predefined tag buttons
        document.querySelectorAll('#categoryTags .tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.textContent;
                if (!tagCategories.has(text)) {
                    tagCategories.add(text);
                    selectedCategories.appendChild(createTag(text, 'category'));
                }
            });
        });

        document.querySelectorAll('#providerTags .tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.textContent;
                if (!tagProviders.has(text)) {
                    tagProviders.add(text);
                    selectedProviders.appendChild(createTag(text, 'provider'));
                }
            });
        });

        // Handle custom tag input
        function handleCustomTagInput(input, selectedSet, container, type) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    const text = input.value.trim();
                    if (!selectedSet.has(text)) {
                        selectedSet.add(text);
                        container.appendChild(createTag(text, type));
                    }
                    input.value = '';
                }
            });
        }

        handleCustomTagInput(
            categoryInput,
            tagCategories,
            selectedCategories,
            'category'
        );

        handleCustomTagInput(
            providersInput,
            tagProviders,
            selectedProviders,
            'provider'
        );

        return { tagCategories, tagProviders };
    }

    // Function to open publish modal
    async function openPublishModal() {
        publishModal.style.display = 'block';
        
        // Clear previous values
        document.getElementById('publishTitle').value = '';
        document.getElementById('publishDescription').value = '';
        selectedCategories.innerHTML = '';
        selectedProviders.innerHTML = '';
        categoryInput.value = '';
        providersInput.value = '';
        
        // Get the current card element
        const cardElement = document.getElementById('microApp');
        
        try {
            // Convert card to image using html2canvas
            console.log('Converting card to image...');
            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 2,
                backgroundColor: null
            });
            const imageData = canvas.toDataURL('image/png');
            console.log('Image generated successfully');

            // Store the image data for use when publishing
            window.currentCardImage = imageData;

            // Initialize tag system
            const { tagCategories, tagProviders } = initializeTagSystem();

            // Handle publish button
            publishNowBtn.onclick = async () => {
                const title = document.getElementById('publishTitle').value.trim();
                const description = document.getElementById('publishDescription').value.trim();

                if (!title || !description || tagCategories.size === 0 || tagProviders.size === 0) {
                    showError('Please fill in all required fields');
                    return;
                }

                try {
                    showLoading(true);
                    const response = await fetch(`${API_URL}/api/publish`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title,
                            description,
                            categories: Array.from(tagCategories),
                            providers: Array.from(tagProviders),
                            cardJson: currentCard,
                            image: window.currentCardImage
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to publish card');
                    }

                    showLoading(false);
                    showMessage('Successfully published to gallery! ', 'success');
                    publishModal.style.display = 'none';
                } catch (error) {
                    console.error('Error publishing:', error);
                    showError(error.message);
                    showLoading(false);
                }
            };
        } catch (error) {
            console.error('Error preparing modal:', error);
            showError('Failed to prepare publish modal');
        }
    }

    // Function to render card
    function renderCard(cardJson) {
        try {
            console.log('Rendering card with JSON:', cardJson);
            
            // Create an AdaptiveCard instance
            const adaptiveCard = new AdaptiveCards.AdaptiveCard();
            
            // Set the card's schema
            adaptiveCard.parse(cardJson);
            
            // Render the card
            const renderedCard = adaptiveCard.render();
            
            // Clear previous content and append the new card
            const container = document.getElementById('adaptiveCardContainer');
            container.innerHTML = '';
            container.appendChild(renderedCard);
            
            // Hide empty state
            document.getElementById('empty-state').style.display = 'none';
            
        } catch (error) {
            console.error('Error rendering card:', error);
            showError('Failed to render card');
        }
    }

    // Function to show message
    function showMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        document.body.appendChild(messageElement);

        // Remove the message after animation completes (3 seconds)
        messageElement.addEventListener('animationend', () => {
            messageElement.remove();
        });
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
    getJsonBtn.addEventListener('click', getCardJSON);

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target.className === 'modal') {
            event.target.style.display = 'none';
        }
    };

    // Get Shareable Link
    shareBtn.addEventListener('click', async () => {
        try {
            const dataUrl = await domtoimage.toPng(document.getElementById('microApp'));
            const response = await fetch(`${API_URL}/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageData: dataUrl.split(',')[1] })
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
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        }, 2000);
                    } catch (err) {
                        // Fallback for older browsers
                        input.select();
                        document.execCommand('copy');
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
            }
        } catch (error) {
            console.error('Error getting shareable link:', error);
        }
    });

    // Publish to Gallery
    /* lkqsjd 
    publishBtn.addEventListener('click', async () => {
        try {
            const dataUrl = await domtoimage.toPng(document.getElementById('microApp'));
            const response = await fetch(`${API_URL}/api/publish`, {
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
    });*/
     
    // Function to render card
    function renderCard(cardJson) {
        try {
            console.log('Rendering card with JSON:', cardJson);
            
            // Create an AdaptiveCard instance
            const adaptiveCard = new AdaptiveCards.AdaptiveCard();
            
            // Set the card's schema
            adaptiveCard.parse(cardJson);
            
            // Render the card
            const renderedCard = adaptiveCard.render();
            
            // Clear previous content and append the new card
            const container = document.getElementById('adaptiveCardContainer');
            container.innerHTML = '';
            container.appendChild(renderedCard);
            
            // Hide empty state
            document.getElementById('empty-state').style.display = 'none';
            
        } catch (error) {
            console.error('Error rendering card:', error);
            showError('Failed to render card');
        }
    }

    // Function to show message
    function showMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        document.body.appendChild(messageElement);

        // Remove the message after animation completes (3 seconds)
        messageElement.addEventListener('animationend', () => {
            messageElement.remove();
        });
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
});
