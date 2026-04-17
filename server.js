const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = 'https://elmodels.ngrok.app/v1/chat/completions';
const API_KEY = 'sk-F6keAXeUKjjBQIdh8homgg';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();
        res.status(response.status).type('application/json').send(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
});

app.post('/api/audio/speech', async (req, res) => {
    try {
        const response = await fetch('https://elmodels.ngrok.app/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();
        res.status(response.status).type('application/json').send(data);
    } catch (error) {
        console.error('Proxy audio error:', error);
        res.status(500).json({ error: 'Proxy audio request failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Hawn app server running at http://localhost:${PORT}`);
});
