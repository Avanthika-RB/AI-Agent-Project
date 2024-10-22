const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const axios = require('axios'); 
require('dotenv').config();
const app = express();
const Interaction = require('./models/Interaction'); 
const EventLog = require('./models/EventLog'); 
const mongoose = require('mongoose');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:',
err));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.post('/chat', async (req, res) => {
    const { history = [], input: userInput, participantID } = req.body; 
    if (!participantID) {
        return res.status(400).send('Participant ID is required');
    }
    const messages = history.length === 0
        ? [{ role: 'system', content: 'You are a helpful assistant.' }, 
        //? [{ role: 'system', content: 'You are a system used to make a quiz based on the prompt.' }, 
           { role: 'user', content: userInput }]
        : [{ role: 'system', content: 'You are a helpful assistant.' },
        //: [{ role: 'system', content: 'You are a system used to make a quiz based on the prompt.' },
           ...history, 
           { role: 'user', content: userInput }];
    try {
        const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
            params: { q: userInput }, 
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
            }
        });
        const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
            title: result.name,
            url: result.url,
            snippet: result.snippet
        }));
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages, 
            max_tokens: 500,
        });
        const botResponse = response.choices[0].message.content.trim();
        const interaction = new Interaction({ userInput, botResponse,
            participantID });
            await interaction.save();
        res.json({ botResponse, searchResults }); 
    } catch (error) {
        console.error('Error: ', error.message); 
        res.status(500).send('Error Found');
    }
});

app.post('/log-event', async (req, res) => {
    const { eventType, elementName, timestamp, participantID } = req.body;
    if (!participantID) {
        return res.status(400).send('Participant ID is required');
    }
    try {
        const event = new EventLog({ eventType, elementName, timestamp, participantID}); 
        await event.save();
        res.status(200).send('Event logged successfully');
    } catch (error) {
        console.error('Error logging event:', error.message);
        res.status(500).send('Server Error');
    }
});
    
app.post('/history', async (req, res) => {
    const { participantID } = req.body; // Get participant ID
    if (!participantID) {
        return res.status(400).send('Participant ID is required');
    }
    try {
        // Fetch all interactions from the database for the given participantID
        const interactions = await Interaction.find({ participantID }).sort({
        timestamp: 1 });
        // Send the conversation history back to the client
        res.json({ interactions });
    } catch (error) {
        console.error('Error fetching conversation history:', error.message);
        res.status(500).send('Server Error');
    }
});
    
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
