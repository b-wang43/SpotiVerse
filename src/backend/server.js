// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Proxy middleware for Spotify API
const proxySpotify = async (req, res) => {
    const { method, body } = req;
    // Remove /api prefix and ensure the path starts with /v1
    const apiPath = req.path.replace('/api', '');
    const spotifyUrl = `https://api.spotify.com/v1${apiPath}`;
    
    console.log('Proxying request:', {
        method,
        originalUrl: req.url,
        spotifyUrl,
        headers: req.headers
    });

    try {
        const spotifyResponse = await axios({
            method: method,
            url: spotifyUrl,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json',
            },
            data: body,
        });

        console.log('Spotify API response:', {
            status: spotifyResponse.status,
            data: spotifyResponse.data
        });

        res.status(spotifyResponse.status).json(spotifyResponse.data);
    } catch (error) {
        console.error('Error proxying Spotify API:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ 
                error: 'Error accessing Spotify API',
                message: error.message 
            });
        }
    }
};

// Apply proxy middleware to all API routes
app.use('/api', proxySpotify);

// Serve static files from the 'build' directory
const buildPath = path.join(__dirname, '../../build');
console.log('Serving static files from:', buildPath);
app.use(express.static(buildPath));

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});