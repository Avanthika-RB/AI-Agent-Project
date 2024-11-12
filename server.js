const express = require("express");
const path = require("path");
const { OpenAI } = require("openai");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");
const marked = require("marked");

require("dotenv").config();

const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const Interaction = require("./models/Interaction"); // Import Interaction model

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// Serve the index.html file on the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/chatbot", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chatbot.html"));
});

// Handle POST requests to /submit
app.post("/submit", async (req, res) => {
  const { history = [], input: userInput, participantID } = req.body; // Only use userInput and history from the request body

  if (!participantID) {
    return res.status(400).send("Participant ID is required");
  }

  if (!userInput) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    // Construct the messages array based on whether conversation history exists or not
    const messages =
      history.length === 0
        ? [
            {
              role: "system",
              content:
                "You are a supportive and knowledgeable language tutor, specializing in helping high school and undergraduate students prepare for their Spanish exams. Focus on explaining vocabulary, grammar, conjugations, sentence structure, and exam strategies in a simple and clear way. Offer interactive conversation practice if the student wants to try speaking, and provide helpful examples for difficult concepts. Adapt your responses to the student's level and try to make learning engaging and stress-free.",
            },
            { role: "user", content: userInput },
          ]
        : [
            {
              role: "system",
              content:
                "You are a supportive and knowledgeable language tutor, specializing in helping high school and undergraduate students prepare for their Spanish exams. Focus on explaining vocabulary, grammar, conjugations, sentence structure, and exam strategies in a simple and clear way. Offer interactive conversation practice if the student wants to try speaking, and provide helpful examples for difficult concepts. Adapt your responses to the student's level and try to make learning engaging and stress-free.",
            },
            ...history,
            { role: "user", content: userInput },
          ];

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 500,
    });

    const botResponse = marked.parse(openaiResponse.choices[0].message.content.trim());
    console.log(openaiResponse.choices[0].message.content.trim());
    console.log(botResponse);

// Perform the Bing search
    // const bingResponse = await axios.get("https://api.bing.microsoft.com/v7.0/search", {
    //   params: { q: userInput }, // Use the user's input as the search query
    //   headers: {
    //     "Ocp-Apim-Subscription-Key": process.env.BING_API_KEY,
    //   },
    // });

    // const searchResults = bingResponse.data.webPages.value.slice(0, 3).map((result) => ({
    //   title: result.name,
    //   url: result.url,
    //   snippet: result.snippet,
    // }));
    const searchResults = "";

    // Log the interaction to MongoDB after botResponse is generated
    const interaction = new Interaction({ userInput, botResponse, participantID });
    await interaction.save(); // Save the interaction to MongoDB

    res.json({ botResponse, searchResults }); // Send a JSON success response
  } catch (error) {
    console.error("Error with OpenAI or Bing API:", error.message);
    res.status(500).json({ error: "Server Error" }); // Send JSON error response for server issues
  }
});

// Extract topics discussed with chatbot based on past 10 interactions
app.post("/extract-topics", async (req, res) => {
  const { interactions } = req.body;

  if (!interactions) {
    return res.status(400).json({ error: "No interactions provided" });
  }

  const prompt = `
    Please identify the key topics discussed in the following Spanish exam preparation interactions. List each topic as a concise phrase relevant to a Spanish language exam. Only include unique topics:
    
    Interactions: ${JSON.stringify({ interactions })}
    
    Provide the topics as a comma-separated list.
  `;

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
    });

    const topicsText = openaiResponse.choices[0].message.content.trim();
    const topics = topicsText.split(",").map((topic) => topic.trim());

    res.json({ topics });
  } catch (error) {
    console.error("Error extracting topics:", error);
    res.status(500).json({ error: "Failed to extract topics" });
  }
});

// Handle POST requests to /generate-question
app.post("/generate-question", async (req, res) => {
  try {
    console.log("Request body received:", req.body);
    const { history = [], participantID, topics, questionTypes, difficulty } = req.body;

    // Validate the required fields
    // if (!participantID || !topics || !questionTypes || !difficulty) {
    //   return res.status(400).json({ error: "Missing required fields" });
    // }

    // Construct the prompt based on user selections
    const prompt = `
      I’m practicing for the [Exam Type: IBDP Spanish Ab Initio]. 
      Provide a [Question Type: ${questionTypes.join(", ")}] question related to [Topics: ${topics.join(", ")}]. 
      Include 4 answer choices labeled A, B, C, D. Only one answer should be correct. Difficulty level: [${difficulty}].


      Whatever type of question you get, make sure to follow this format (example format) and make sure the correct answer is under "---":
      ¿Cuál es la forma correcta del verbo "comer" en la primera persona del singular del pretérito perfecto?
      A) Comí
      B) Comera
      C) He comido
      D) Coma

      ---
      Correct Answer: A

      ---
      Brief Explanation: "Comí" is the correct form in the simple past tense for the first person singular in Spanish. This tense is used for actions completed in the past, whereas the other options correspond to different tenses or moods.
    `.trim();

    // Make the request to the OpenAI API
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const botResponse = openaiResponse.choices[0].message.content.trim();
    console.log("Response from OpenAI:", botResponse);

    // Send the generated question back to the client
    res.json({ question: botResponse, history: history });
  } catch (error) {
    console.error("Error in /generate-question:", error);
    res.status(500).json({ error: "Failed to generate question" });
  }
});

const EventLog = require("./models/EventLog"); // Import EventLog model

app.post("/log-event", async (req, res) => {
  const { eventType, elementName, timestamp, participantID } = req.body;

  if (!participantID) {
    return res.status(400).send("Participant ID is required");
  }

  try {
    // Log the event to MongoDB
    const event = new EventLog({ eventType, elementName, timestamp, participantID });
    await event.save();
    res.status(200).send("Event logged successfully");
  } catch (error) {
    console.error("Error logging event:", error.message);
    res.status(500).send("Server Error");
  }
});

// Define a POST route for retrieving chat history by participantID
// POST route to fetch conversation history by participantID
app.post("/history", async (req, res) => {
  const { participantID } = req.body; // Get participant ID

  if (!participantID) {
    return res.status(400).send("Participant ID is required");
  }

  try {
    // Fetch all interactions from the database for the given participantID
    const interactions = await Interaction.find({ participantID }).sort({
      timestamp: 1,
    });

    // Send the conversation history back to the client
    res.json({ interactions });
  } catch (error) {
    console.error("Error fetching conversation history:", error.message);
    res.status(500).send("Server Error");
  }
});

app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
