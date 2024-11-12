document.getElementById("submit").addEventListener("click", () => {
  // logEvent('click', 'Send Button');
});

document.getElementById("chat-container").addEventListener("mouseover", () => {
  // logEvent('hover', 'User Input');
});

document.getElementById("chat-container").addEventListener("focus", () => {
  // logEvent('focus', 'User Input');
});

// Function to log events to the server
function logEvent(type, element) {
  fetch("/log-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: type, elementName: element, timestamp: new Date() }),
  });
}
