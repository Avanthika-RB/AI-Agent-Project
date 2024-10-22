let inputField = document.getElementById('user-input');
let sendBtn = document.getElementById('send-btn');
let messagesContainer = document.getElementById('messages');
const participantID = localStorage.getItem('participantID');
if (!participantID) {
    alert('Please enter a participant ID.');
    window.location.href = '/';
}

let conversationHistory = [];
async function sendMessage() {
    let userMessage = inputField.value.trim();
    if (userMessage === '') {
        alert('Type your message');
        return;
    }
    let messageElement = document.createElement('div');
    messageElement.textContent = `User: ${userMessage}`;
    messagesContainer.appendChild(messageElement);
    inputField.value = '';
    inputField.focus();
    try {
        const payload = conversationHistory.length === 0
        ? { input: userMessage, participantID } 
        : { history: conversationHistory, input: userMessage, participantID };
        let response = await fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
        });
        let data = await response.json();
        let botMessageElement = document.createElement('div');
        botMessageElement.textContent = `ChatBot: ${data.botResponse}`;
        messagesContainer.appendChild(botMessageElement);
        if (data.searchResults && data.searchResults.length > 0) {
            const searchResultsDiv = document.createElement('div');
            data.searchResults.forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `<a href="${result.url}"
            target="_blank">${result.title}</a><p>${result.snippet}</p>`;
            searchResultsDiv.appendChild(resultDiv);
            });
            document.getElementById('messages').appendChild(searchResultsDiv);
        }
        conversationHistory.push({ role: 'user', content: userInput });
        conversationHistory.push({ role: 'assistant', content: data.botResponse});
    } catch (error) {
        console.error('Error:', error);
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
    const response = await fetch('/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantID }) // Send participantID to the server
    });
    const data = await response.json();
    if (data.interactions && data.interactions.length > 0) {
        data.interactions.forEach(interaction => {
        const userMessageDiv = document.createElement('div');
        userMessageDiv.textContent = `You: ${interaction.userInput}`;
        document.getElementById('messages').appendChild(userMessageDiv);
        const botMessageDiv = document.createElement('div');
        botMessageDiv.textContent = `Bot: ${interaction.botResponse}`;
        document.getElementById('messages').appendChild(botMessageDiv);
        // Add to conversation history
        conversationHistory.push({ role: 'user', content: interaction.userInput });
        conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
        });
    }
}
// Load history when agent loads
window.onload = loadConversationHistory;

function logEvent(eventType, elementId) {
    fetch('/log-event', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event: eventType, element: elementId, timestamp: new Date() }),
    }).catch(error => console.error('Event logging error:', error));
}

//event listener chatbot
function setupChatbotEventLogging() {
    let inputField = document.getElementById('user-input');
    let sendBtn = document.getElementById('send-btn');
    inputField.addEventListener('mouseover', () => logEvent('hover', 'user-input'));
    sendBtn.addEventListener('mouseover', () => logEvent('hover', 'send-btn'));
    inputField.addEventListener('focus', () => logEvent('focus', 'user-input'));
    sendBtn.addEventListener('click', () => logEvent('click', 'send-btn'));
}

//event listener main page in index
function setupHomepageEventLogging() {
    let navigate = document.getElementById('navigate-chatbot');
    if (navigate) { 
        navigate.addEventListener('mouseover', () => logEvent('hover', 'navigate-chatbot'));
        navigate.addEventListener('click', () => logEvent('click', 'navigate-chatbot'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('send-btn')) {
        setupChatbotEventLogging();
        let sendBtn = document.getElementById('send-btn');
        let inputField = document.getElementById('user-input');
        sendBtn.addEventListener('click', sendMessage);
        inputField.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
        });
    }
    if (document.getElementById('navigate-chatbot')) {
        setupHomepageEventLogging();
        let navigate = document.getElementById('navigate-chatbot');
        navigate.addEventListener('click', () => {
        window.location.href = 'chat.html';
        });
    }
});

async function fetchinteractiondata() {
    let fetchLog = document.getElementById('fetch-logs');
    let logsContainer = document.getElementById('logs');
    if (fetchLog) {
        fetchLog.addEventListener('click', async function () {
        try {
            let response = await fetch('/get-logs');
            let logs = await response.json();
            logsContainer.innerHTML = ''; 
            logs.forEach(log => {
            let logElement = document.createElement('div');
            logElement.textContent = `Event: ${log.event}, Element: ${log.element}, Timestamp: ${new Date(log.timestamp).toLocaleString()}`;
            logsContainer.appendChild(logElement);
            });
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
        });
    }
}
document.addEventListener('DOMContentLoaded', fetchinteractiondata);