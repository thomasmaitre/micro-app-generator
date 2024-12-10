require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// MongoDB connection URI and database name
const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri ? 'URI is set' : 'URI is not set');

if (!uri) {
    console.error('MONGODB_URI environment variable is not set!');
    process.exit(1);
}

const dbName = 'microAppGallery';

// Connect to MongoDB
let db;
async function connectToDatabase() {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        const client = await MongoClient.connect(uri, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            retryWrites: true,
            w: 'majority'
        });
        console.log('Connected to MongoDB Atlas successfully');
        db = client.db(dbName);
        return client;
    } catch (error) {
        console.error('MongoDB Atlas connection error:', error);
        throw error;
    }
}

// Initialize database connection and start server
async function startServer() {
    try {
        const client = await connectToDatabase();
        
        // Verify the connection
        await client.db().admin().ping();
        console.log("Successfully connected to MongoDB Atlas!");
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Add a root endpoint for testing
app.get('/', (req, res) => {
    res.json({ status: 'Server is running', endpoints: ['/generate-card', '/upload-image', '/api/publish', '/api/images'] });
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
app.get('/api/gallery', async (req, res) => {
    try {
        const collection = db.collection('images');
        const microApps = await collection.find({}).toArray();
        
        // Ensure categories and providers are arrays, even if they're undefined
        const processedApps = microApps.map(app => ({
            ...app,
            categories: app.categories || [],
            providers: app.providers || []
        }));
        
        res.json(processedApps);
    } catch (error) {
        console.error('Error fetching micro-apps:', error);
        res.status(500).json({ error: 'Failed to fetch micro-apps' });
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
app.post('/api/upvote/:id', async (req, res) => {
    try {
        const id = new ObjectId(req.params.id);
        const result = await db.collection('images').updateOne(
            { _id: id },
            { $inc: { upvotes: 1 } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'Micro-app not found' });
        }
        
        const updatedApp = await db.collection('images').findOne({ _id: id });
        res.json({ success: true, upvotes: updatedApp.upvotes });
    } catch (error) {
        console.error('Error updating upvotes:', error);
        res.status(500).json({ success: false, error: 'Failed to update upvotes' });
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
        const microApps = await db.collection('images').find().toArray();
        const providers = [...new Set(microApps.flatMap(app => app.providers))];
        res.json(providers);
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});

// Serve images by ID
app.get('/images/:id', async (req, res) => {
    try {
        console.log('Received request for image with ID:', req.params.id);
        const id = new ObjectId(req.params.id);
        console.log('Looking for document with ID:', id);
        
        const microApp = await db.collection('images').findOne({ _id: id });
        console.log('Found microApp:', microApp ? 'Yes' : 'No');
        
        if (!microApp || !microApp.image) {
            console.log('Image not found or no image data');
            return res.status(404).send('Image not found');
        }

        // Extract base64 data and remove the data URL prefix if present
        let imageData = microApp.image;
        if (imageData.includes(',')) {
            imageData = imageData.split(',')[1];
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(imageData, 'base64');
        console.log('Successfully created image buffer');

        // Set content type and send buffer
        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).send('Error serving image');
    }
});

startServer();
