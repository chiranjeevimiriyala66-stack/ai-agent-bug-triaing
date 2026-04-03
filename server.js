const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve the 'public' folder first
app.use(express.static(path.join(__dirname, 'public')));
// Fallback to serving the root directory in case you drag-and-dropped files directly into GitHub
app.use(express.static(__dirname));

app.post('/api/triage', async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Missing bug report text' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_KEY is not set in backend .env' });
    }

    try {
        const prompt = `Act as an Autonomous DevOps Lead. Analyze the intent of the following bug report. Determine its priority (P0, P1, P2, P3), the category (Frontend, Backend, DB, Security, Mobile, DevOps). Explicitly pick the best Developer from our team (Rahul for Security/Payments, Suresh for Frontend, Priya for DB, Anita for General/Fullstack, David for Mobile, Sarah for DevOps, Alex for Backend API) based on technical context. Return ONLY a valid JSON object with the schema: {"priority": "...", "category": "...", "rootCause": "...", "assignedDev": "...", "component": "..."}. Bug report: "${text}"`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            let rawText = data.candidates[0].content.parts[0].text;
            rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const aiConfig = JSON.parse(rawText);
            return res.json({ aiConfig });
        } else {
            console.log("Unexpected Gemini resp:", JSON.stringify(data));
            return res.status(500).json({ error: 'Failed to parse Gemini response' });
        }
    } catch (e) {
        console.error("Backend Error contacting Gemini API", e);
        return res.status(500).json({ error: 'Failed to communicate with Gemini API' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
