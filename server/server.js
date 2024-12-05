require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// MongoDB connection URI and database name
const uri = process.env.MONGODB_URI;
const dbName = 'microAppGallery';

// Connect to MongoDB
let db;
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        console.log('Connected to MongoDB');
    })
    .catch(error => console.error('MongoDB connection error:', error));

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
        const { image } = req.body;
        console.log('Publishing image:', image.slice(0, 100));

        // Insert image data into MongoDB
        const result = await db.collection('images').insertOne({ image });

        res.json({ success: true, message: 'Image published successfully!', id: result.insertedId });
    } catch (error) {
        console.error('Error publishing image:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
