require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Configure CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://thomasmaitre.github.io', 'https://thomasmaitre.github.io/micro-app-generator'] 
        : ['http://localhost:8000', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure body parser
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// MongoDB connection URI and database name
const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri ? 'URI is set' : 'URI is not set');
console.log('Environment:', process.env.NODE_ENV);

if (!uri) {
    console.error('MONGODB_URI environment variable is not set!');
    process.exit(1);
}

const dbName = 'microAppGallery';
let db;
let mongoClient;

// Connect to MongoDB
async function connectToDatabase() {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        console.log('Database Name:', dbName);
        console.log('URI exists:', !!uri);
        
        mongoClient = await MongoClient.connect(uri, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            retryWrites: true,
            w: 'majority'
        });
        
        console.log('Connected to MongoDB Atlas successfully');
        db = mongoClient.db(dbName);
        
        // Test the connection by listing collections
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        return mongoClient;
    } catch (error) {
        console.error('MongoDB Atlas connection error:', error);
        throw error;
    }
}

// Initialize database connection and start server
async function startServer() {
    try {
        await connectToDatabase();
        
        // Verify the connection
        await mongoClient.db().admin().ping();
        console.log("Successfully connected to MongoDB Atlas!");

        // Setup routes after database connection is confirmed
        setupRoutes();
        
        // Start listening only after routes are set up
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log('Available endpoints:', app._router.stack
                .filter(r => r.route)
                .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`));
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

function setupRoutes() {
    // Add a root endpoint for testing
    app.get('/', (req, res) => {
        console.log('Root endpoint hit');
        const endpoints = [
            '/generate-card',
            '/upload-image',
            '/api/publish',
            '/api/images',
            '/api/microappgallery',
            '/api/microappgallery/:id/image',
            '/api/categories',
            '/api/providers',
            '/api/micro-app/:id',
            '/api/upvotemicroapp/:id',
            '/api/generate-micro-app',
            '/publish-preview',
            '/published-preview/:id',
            '/api/cardgallery',
            '/api/cardgallery/:id/image',
            '/api/card/:id',
            '/api/upvotecard/:id',
            '/api/downvotecard/:id'
        ];
        
        res.json({ 
            status: 'Server is running', 
            environment: process.env.NODE_ENV,
            endpoints,
            corsOrigins: process.env.NODE_ENV === 'production' 
                ? ['https://thomasmaitre.github.io', 'https://thomasmaitre.github.io/micro-app-generator'] 
                : ['http://localhost:8000', 'http://localhost:3000']
        });
    });

    app.post('/generate-card', async (req, res) => {
        try {
            const { description } = req.body;
            
            if (!description) {
                return res.status(400).json({ 
                    error: 'Description is required' 
                });
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that generates Adaptive Cards JSON. Create visually appealing cards that follow best practices for layout and design. Always respond with valid JSON that can be parsed."
                        },
                        {
                            role: "user",
                            content: `Create an Adaptive Card JSON for: ${description}. Make it visually appealing and functional. Add structure input fields, buttons, and other interactive elements to make it user-friendly. If the card is a list, make the elements visually distinct and easy to navigate. IMPORTANT: Respond only with the JSON, no additional text or explanations.`
                        }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API request failed');
            }

            const data = await response.json();
            const cardContent = data.choices[0].message.content.trim();
            
            // Try to parse the JSON, handling potential formatting issues
            let cardJson;
            try {
                cardJson = JSON.parse(cardContent);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                // Try to extract JSON if it's wrapped in backticks or has extra text
                const jsonMatch = cardContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cardJson = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Failed to parse card JSON from OpenAI response');
                }
            }

            res.json(cardJson);
        } catch (error) {
            console.error('Error generating card:', error);
            res.status(500).json({ 
                error: 'Failed to generate card',
                details: error.message 
            });
        }
    });

    app.post('/upload-image', async (req, res) => {
        try {
            const { imageData } = req.body;
            
            if (!imageData) {
                return res.status(400).json({ 
                    success: false,
                    error: 'No image data provided' 
                });
            }

            const apiKey = process.env.IMGBB_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ 
                    success: false,
                    error: 'ImgBB API key not configured' 
                });
            }

            // Create form data with base64 image
            const formData = new FormData();
            formData.append('image', imageData);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ImgBB API error:', errorText);
                throw new Error(`ImgBB API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.data) {
                throw new Error('Invalid response from ImgBB');
            }

            res.json({
                success: true,
                data: {
                    url: result.data.url,
                    delete_url: result.data.delete_url
                }
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    });

    app.post('/api/publish', async (req, res) => {
        try {
            console.log('Received publish request');
            const { title, description, categories, providers, cardJson, image } = req.body;
            
            console.log('Received data:');
            console.log('- Title:', title);
            console.log('- Description:', description);
            console.log('- Categories:', categories);
            console.log('- Providers:', providers);
            console.log('- CardJson present:', !!cardJson);
            console.log('- Image present:', !!image);
            console.log('- Image type:', typeof image);
            if (image) {
                console.log('- Image preview:', image.substring(0, 100) + '...');
            }
            
            // Validate required fields
            if (!title) {
                return res.status(400).json({ error: 'Title is required' });
            }
            if (!description) {
                return res.status(400).json({ error: 'Description is required' });
            }
            if (!categories || categories.length === 0) {
                return res.status(400).json({ error: 'At least one category is required' });
            }
            if (!providers || providers.length === 0) {
                return res.status(400).json({ error: 'At least one provider is required' });
            }
            if (!cardJson) {
                return res.status(400).json({ error: 'Card JSON is required' });
            }
            if (!image) {
                return res.status(400).json({ error: 'Card image is required' });
            }
            if (!image.startsWith('data:image/')) {
                return res.status(400).json({ error: 'Invalid image format. Must be a data URL' });
            }

            // Save to MongoDB
            const result = await db.collection('images').insertOne({
                title,
                description,
                categories,
                providers,
                cardJson,
                image,
                createdAt: new Date()
            });

            console.log('Successfully saved to MongoDB:', result.insertedId);
            res.json({ success: true, id: result.insertedId });
        } catch (error) {
            console.error('Error publishing to gallery:', error);
            res.status(500).json({ error: 'Internal server error: ' + error.message });
        }
    });

    app.get('/api/images', async (req, res) => {
        try {
            const images = await db.collection('images').find().toArray();
            res.json({ success: true, images });
        } catch (error) {
            console.error('Error fetching images:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // Add endpoint to get all micro-apps
    app.get('/api/microappgallery', async (req, res) => {
        try {
            const microAppsCollection = db.collection('images');
            const microApps = await microAppsCollection.find({}).toArray();
            console.log('Found micro-apps:', microApps.length);
            res.json(microApps);
        } catch (error) {
            console.error('Error fetching micro-apps:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get specific micro-app by ID
    app.get('/api/micro-app/:id', async (req, res) => {
        try {
            const id = new ObjectId(req.params.id);
            const microApp = await db.collection('images').findOne({ _id: id });
            
            if (!microApp) {
                return res.status(404).json({ success: false, error: 'Micro-app not found' });
            }
            
            res.json(microApp);
        } catch (error) {
            console.error('Error fetching micro-app:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch micro-app' });
        }
    });

    // Update upvotes for a micro-app
    app.post('/api/upvotemicroapp/:id', async (req, res) => {
        try {
            console.log('Upvoting micro-app:', req.params.id);
            const id = new ObjectId(req.params.id);
            
            // First, check if the document exists
            const microApp = await db.collection('images').findOne({ _id: id });
            if (!microApp) {
                console.error('Micro-app not found:', req.params.id);
                return res.status(404).json({ 
                    success: false, 
                    error: 'Micro-app not found' 
                });
            }

            // Initialize upvotes if it doesn't exist
            const currentUpvotes = microApp.upvotes || 0;
            
            // Update the document
            const result = await db.collection('images').updateOne(
                { _id: id },
                { $set: { upvotes: currentUpvotes + 1 } }
            );
            
            if (result.modifiedCount === 0) {
                console.error('Failed to update upvotes for:', req.params.id);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to update upvotes' 
                });
            }
            
            console.log('Successfully upvoted micro-app:', req.params.id);
            res.json({ 
                success: true, 
                upvotes: currentUpvotes + 1 
            });
        } catch (error) {
            console.error('Error updating upvotes:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update upvotes',
                details: error.message 
            });
        }
    });

    // Get all categories
    app.get('/api/categories', async (req, res) => {
        try {
            console.log('Attempting to connect to database...');
            if (!db) {
                throw new Error('Database connection not established');
            }

            console.log('Fetching images collection...');
            const collection = db.collection('images');
            if (!collection) {
                throw new Error('Images collection not found');
            }

            console.log('Querying documents...');
            const microApps = await collection.find({}).toArray();
            console.log('Found documents:', microApps.length);

            console.log('Extracting categories...');
            const categories = microApps.flatMap(app => app.categories || []);
            const uniqueCategories = [...new Set(categories)];
            console.log('Unique categories found:', uniqueCategories);

            res.json(uniqueCategories);
        } catch (error) {
            console.error('Detailed error in /api/categories:', {
                message: error.message,
                stack: error.stack
            });
            res.status(500).json({ 
                error: 'Failed to fetch categories',
                details: error.message 
            });
        }
    });

    // Get all providers
    app.get('/api/providers', async (req, res) => {
        try {
            const collection = db.collection('images');
            const microApps = await collection.find({}).toArray();
            const providers = microApps.flatMap(app => app.providers || []);
            const uniqueProviders = [...new Set(providers)];
            res.json(uniqueProviders);
        } catch (error) {
            console.error('Error fetching providers:', error);
            res.status(500).json({ error: 'Failed to fetch providers' });
        }
    });

    // Get image for a specific micro-app
    app.get('/api/microappgallery/:id/image', async (req, res) => {
        try {
            console.log('Fetching image for id:', req.params.id);
            let id;
            try {
                id = new ObjectId(req.params.id);
            } catch (error) {
                console.error('Invalid ObjectId:', req.params.id);
                return res.status(400).json({ error: 'Invalid ID format' });
            }

            const microApp = await db.collection('images').findOne({ _id: id });
            console.log('Found microApp:', microApp ? 'yes' : 'no');
            
            if (!microApp) {
                console.error('MicroApp not found for id:', req.params.id);
                return res.status(404).json({ error: 'MicroApp not found' });
            }

            if (!microApp.image) {
                console.error('Image data missing for id:', req.params.id);
                return res.status(404).json({ error: 'Image data missing' });
            }

            console.log('Image data type:', typeof microApp.image);
            console.log('Image data preview:', microApp.image.substring(0, 100) + '...');
            
            // Extract image data and content type from the data URL
            const matches = microApp.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            console.log('Image data format valid:', matches ? 'yes' : 'no');
            
            if (!matches || matches.length !== 3) {
                console.error('Invalid image data format');
                return res.status(400).json({ error: 'Invalid image data format' });
            }
            
            const contentType = matches[1];
            const imageData = Buffer.from(matches[2], 'base64');
            
            console.log('Content-Type:', contentType);
            console.log('Image data size:', imageData.length, 'bytes');

            res.set('Content-Type', contentType);
            res.send(imageData);
        } catch (error) {
            console.error('Error fetching image:', error);
            res.status(500).json({ error: 'Failed to fetch image', details: error.message });
        }
    });

    // Endpoint to get a preview by ID
    app.get('/preview/:id', async (req, res) => {
        try {
            console.log('Preview request:', {
                id: req.params.id,
                headers: req.headers,
                url: req.url,
                path: req.path
            });

            const previewId = new ObjectId(req.params.id);
            const preview = await db.collection('previews').findOne({ _id: previewId });
            console.log('Found preview:', preview ? 'yes' : 'no');

            if (!preview) {
                return res.status(404).json({ error: 'Preview not found' });
            }

            return res.json(preview);

        } catch (error) {
            console.error('Error retrieving preview:', error);
            res.status(500).json({ 
                error: 'Failed to retrieve preview',
                details: error.message 
            });
        }
    });

    // Generate full micro-app JSON
    app.post('/api/generate-micro-app', async (req, res) => {
        try {
            const { title, description, categories, providers } = req.body;
            
            if (!title || !description || !categories || !providers) {
                return res.status(400).json({ 
                    error: 'Missing required fields: title, description, categories, and providers are required' 
                });
            }

            console.log('Generating micro-app with:', { title, description, categories, providers });

            const prompt = `We built a tool that allow users to create micro-apps.
A Micro-app is a sequence of block of either type adaptive card or api call. All micro-apps start with a trigger block.
Adaptive card block are used to display information or ask for information to the end user.
API call blocks are used to make api call to a third party.

Generate a micro-app based on this context:
- title: ${title}
- description: ${description}
- category: ${categories.join(', ')}
- providers: ${providers.join(', ')}

The micro-app should follow the DTO structure and include proper blocks based on the description and providers. Make sure to generate valid JSON that matches the MicroAppPayload type.

IMPORTANT: Respond only with the JSON, no additional text or explanations.`;
            const microAppExample = `[
    {
        "code": "show_status",
        "id": "a4d0b16d-51b8-42dd-a1b6-02058e37c653",
        "name": "Show status",
        "settings": {
        "template": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "body": [
                       {
            "text": "Text",
            "type": "TextBlock",
            "wrap": true
                       }
                   ],
        "type": "AdaptiveCard",
        "version": "1.6"
               }
           },
"type": "adaptive_card",
"links": [],
"position": {
"x": 456,
"y": 0
           }
       },
{
    "code": "github",
    "id": "4c374909-b84a-4154-b5db-648b762550df",
    "name": "github",
    "settings": {
    "authentication": {
    "method": "public"
},
"endpoint": {
"httpMethod": "GET",
"body": "",
"path": "",
"queryParams": [],
"url": "https://api.github.com/status"
               }
           },
"type": "api_call",
"links": [
{
    "targetId": "a4d0b16d-51b8-42dd-a1b6-02058e37c653"
}
           ],
"position": {
"x": 228,
"y": 0
           }
       },
{
    "code": "start",
    "id": "fe99cbbc-87a5-43a9-838e-39d9acc0dcf7",
    "name": "Start",
    "type": "trigger",
    "links": [
    {
        "targetId": "4c374909-b84a-4154-b5db-648b762550df"
    }
           ],
    "position": {
    "x": 0,
    "y": 0
}
       }
    ].
    
    Here are the DTO from the code
import { EntityPayload } from "./entity-payload";
/**
* MicroApp message properties.
* @todo EntityPayload : It will have to be improved as it's a shared entity
*/
export type MicroAppPayload = EntityPayload & {
    /**
     * extension's id
     */
    extensionId: string;
    /**
     * extension's version id
     */
    extensionVersionId: string;
    /**
     * The partner's ID related to the extension
     * @example 440a5c5a-9300-4b20-afce-182c9a42394a
     */
    partnerId: string;
    /**
     * MicroApp actions
     */
    actions: Array<
        | MicroAppApiCallAction
        | MicroAppAdaptiveCardAction
        | MicroAppRouterAction
        | MicroAppTriggerAction
        | MicroAppFunctionAction
    >;
};
type MicroAppAction = {
    /**
     * Unique identifier of the action
     * @example f94d4327-d5e2-4a57-86aa-39f5d45d4c8f
     */
    id: string;
    /**
     *  Links attached to this action
     */
    links?: {
        /**
         *  The ID of the action targeted by this edge
         */
        targetId: string;
    }[];
    /**
     * Display name
     */
    name: string;
    /**
     * Normalized name set as ID. It will be used in execution context data
     */
    code: string;
    /**
     * Type of action
        - adaptive_card: return a AdaptiveCard JSON from template
        - api_call: execute an HTTP Request, put the result in execution context
        - router: allow multi path flow
        - trigger: first action of the flow
     */
    type: "adaptive_card" | "api_call" | "router" | "trigger" | "function";
};
type MicroAppApiCallAction = MicroAppAction & {
    type: "api_call";
    settings: MicroAppAPICallSettings;
};
type MicroAppAdaptiveCardAction = MicroAppAction & {
    type: "adaptive_card";
    settings: MicroAppAdaptiveCardSettings;
};
type MicroAppRouterAction = MicroAppAction & {
    type: "router";
};
type MicroAppTriggerAction = MicroAppAction & {
    type: "trigger";
};
type MicroAppFunctionAction = MicroAppAction & {
    type: "function";
    settings: MicroAppFunctionActionSettings;
};
type MicroAppAPICallSettings = {
    /**
     * Request settings (only if type is api)
     */
    endpoint: MicroAppAPICallSettingsEndpoint;
    /**
     * Request authentication settings
     */
    authentication: MicroAppAPICallAuthenticationSettings;
    /**
     * Provider identifier for authenticated API calls (only if type is api)
     *
     * @deprecated will be removed after authentication migration
     */
    providerType?: string;
};
type MicroAppAPICallAuthenticationSettings = {
    /**
     * Type of authentication for the api call
     *  - public: for non authenticated calls
     *  - lumapps: for internal api calls (using the Lumapps user's jwt)
     *  - connector: for third party provider authenticated calls (ie: slack, microsoft, ...)
     */
    method: "public" | "lumapps" | "connector";
    /**
     * Provider identifier for authenticated API calls (only if type is api)
     *
     * @example microsoft
     */
    providerType?: string;
};
type MicroAppAPICallSettingsEndpoint = {
    httpMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
    /**
     * Absolute URL to request
     * Required when providerType is undefined
     * @example https://api.lumapps.net/entities
     */
    url?: string;
    /**
     * Relative URL to request
     * It will be join to the base URL of the provider connector
     * Must start with a slash
     * Required when providerType is defined
     * @example /entities
     */
    path?: string;
    /**
     * HTTP headers to sent (key-value object)
     */
    headers?: { [key: string]: string };
    /**
     * URL query params to sent (key-value object)
     */
    queryParams?: { key: string; value: string }[];
    /**
     *  Body value, it could be a template
     */
    body?: string;
};
type MicroAppAdaptiveCardSettings = {
    template?: AdaptiveCard;
};
/**
 Adaptive Card template, using MS Adaptive Card format
 Only if type is adaptive_card
 Schema: http://adaptivecards.io/schemas/adaptive-card.json
 Example: https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format
*/
type AdaptiveCard = {
    $schema: string;
    actions?: unknown;
    body: unknown;
    type: "AdaptiveCard";
    version: string;
};
type MicroAppFunctionActionSettings = {
    language: "javascript";
    source: string;
};`
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that generates micro-app JSON configurations. Always respond with valid JSON that matches the MicroAppPayload type structure."
                        },
                        {
                            role: "user",
                            content: "app that start with the trigger block, that we perform an api call to github in order to get the status message that we display to the end user in an adaptive card."
                        },
                        {
                            role: "assistant",
                            content: microAppExample
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API request failed');
            }

            const data = await response.json();
            const microAppJson = data.choices[0].message.content.trim();
            
            // Try to parse the JSON to validate it
            try {
                JSON.parse(microAppJson);
            } catch (parseError) {
                throw new Error('Generated JSON is invalid: ' + parseError.message);
            }

            console.log('Successfully generated micro-app JSON');
            res.json({ success: true, microAppJson });
        } catch (error) {
            console.error('Error generating micro-app:', error);
            res.status(500).json({ 
                error: 'Failed to generate micro-app',
                details: error.message 
            });
        }
    });

    app.post('/publish-preview', async (req, res) => {
        try {
            console.log('Received publish preview request:', {
                body: req.body,
                contentType: req.headers['content-type']
            });

            const { appName, logo, selectedApps, timestamp, previewHtml } = req.body;
            
            // Validate required fields
            if (!appName) {
                throw new Error('App name is required');
            }
            if (!previewHtml) {
                throw new Error('Preview HTML is required');
            }
            
            // Ensure selectedApps is an array
            const apps = Array.isArray(selectedApps) ? selectedApps : [];
            
            console.log('Extracted data:', {
                appName,
                logo: logo ? 'exists' : 'missing',
                selectedAppsCount: apps.length,
                timestamp,
                previewHtmlLength: previewHtml ? previewHtml.length : 0
            });

            // Save to MongoDB
            const preview = {
                appName,
                logo: logo || '',
                selectedApps: apps,
                previewHtml,
                timestamp: timestamp || new Date().toISOString(),
                createdAt: new Date()
            };

            console.log('Saving preview to MongoDB:', {
                appName: preview.appName,
                selectedAppsCount: preview.selectedApps.length,
                hasHtml: !!preview.previewHtml,
                previewHtmlLength: preview.previewHtml.length,
                collectionName: 'previews'
            });

            // Verify database connection
            if (!db) {
                console.error('Database connection not available');
                throw new Error('Database connection not available');
            }

            // Get the previews collection
            const previewsCollection = db.collection('previews');
            console.log('Got previews collection');

            // Insert the preview
            const result = await previewsCollection.insertOne(preview);
            console.log('Successfully saved preview with ID:', result.insertedId);

            // Verify the insert by fetching the document
            const savedPreview = await previewsCollection.findOne({ _id: result.insertedId });
            console.log('Verified saved preview:', {
                id: savedPreview._id,
                appName: savedPreview.appName,
                hasHtml: !!savedPreview.previewHtml,
                previewHtmlLength: savedPreview.previewHtml.length
            });

            // Return the URL that points to our single preview.html with the ID as a query parameter
            const baseUrl = process.env.NODE_ENV === 'production'
                ? 'https://thomasmaitre.github.io/micro-app-generator'
                : 'http://localhost:8000';
            const publicUrl = `${baseUrl}/published-preview.html?id=${result.insertedId}`;

            console.log('Generated public URL:', publicUrl);
            res.json({ publicUrl });
        } catch (error) {
            console.error('Error publishing preview:', error);
            res.status(500).json({ error: error.message || 'Failed to publish preview' });
        }
    });

    // Endpoint to get a published preview by ID
    app.get('/published-preview/:id', async (req, res) => {
        try {
            console.log('Getting published preview:', req.params.id);
            const previewId = new ObjectId(req.params.id);
            const preview = await db.collection('previews').findOne({ _id: previewId });
            
            if (!preview) {
                return res.status(404).json({ error: 'Preview not found' });
            }

            res.json(preview);
        } catch (error) {
            console.error('Error retrieving preview:', error);
            res.status(500).json({ 
                error: 'Failed to retrieve preview',
                details: error.message 
            });
        }
    });

    // Card Gallery Routes
    const cardsCollection = db.collection('cards');
    app.get('/api/cardgallery', async (req, res) => {
        try {
            const cards = await cardsCollection.find({}).toArray();
            res.json(cards);
        } catch (error) {
            console.error('Error fetching cards:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

        // Get image for a specific micro-app
        app.get('/api/cardgallery/:id/image', async (req, res) => {
            try {
                console.log('Fetching image for id:', req.params.id);
                let id;
                try {
                    id = new ObjectId(req.params.id);
                } catch (error) {
                    console.error('Invalid ObjectId:', req.params.id);
                    return res.status(400).json({ error: 'Invalid ID format' });
                }
    
                const card = await db.collection('cards').findOne({ _id: id });
                console.log('Found card:', card ? 'yes' : 'no');
                
                if (!card) {
                    console.error('card not found for id:', req.params.id);
                    return res.status(404).json({ error: 'card not found' });
                }
    
                if (!card.image) {
                    console.error('Image data missing for id:', req.params.id);
                    return res.status(404).json({ error: 'Image data missing' });
                }
    
                console.log('Image data type:', typeof card.image);
                console.log('Image data preview:', microApp.image.substring(0, 100) + '...');
                
                // Extract image data and content type from the data URL
                const matches = card.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
                console.log('Image data format valid:', matches ? 'yes' : 'no');
                
                if (!matches || matches.length !== 3) {
                    console.error('Invalid image data format');
                    return res.status(400).json({ error: 'Invalid image data format' });
                }
                
                const contentType = matches[1];
                const imageData = Buffer.from(matches[2], 'base64');
                
                console.log('Content-Type:', contentType);
                console.log('Image data size:', imageData.length, 'bytes');
    
                res.set('Content-Type', contentType);
                res.send(imageData);
            } catch (error) {
                console.error('Error fetching image:', error);
                res.status(500).json({ error: 'Failed to fetch image', details: error.message });
            }
        });

    app.get('/api/card/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const card = await cardsCollection.findOne({ _id: new ObjectId(id) });
            if (!card) {
                return res.status(404).json({ error: 'Card not found' });
            }
            res.json(card);
        } catch (error) {
            console.error('Error fetching card:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/upvotecard/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const result = await cardsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { upvotes: 1 } }
            );
            if (result.modifiedCount === 0) {
                return res.status(404).json({ error: 'Card not found' });
            }
            const updatedCard = await cardsCollection.findOne({ _id: new ObjectId(id) });
            res.json({ upvotes: updatedCard.upvotes });
        } catch (error) {
            console.error('Error upvoting card:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/downvotecard/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const result = await cardsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { upvotes: -1 } }
            );
            if (result.modifiedCount === 0) {
                return res.status(404).json({ error: 'Card not found' });
            }
            const updatedCard = await cardsCollection.findOne({ _id: new ObjectId(id) });
            res.json({ upvotes: updatedCard.upvotes });
        } catch (error) {
            console.error('Error downvoting card:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

startServer();
