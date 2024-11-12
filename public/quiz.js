async function startQuizProcess() {
  // Get the last 10 interactions from the conversation history
  const recentInteractions = conversationHistory.slice(-10);

  // Extract topics from recent interactions and then submit settings
  await extractTopicsFromHistory(recentInteractions);
}

// Extracting relevant topics from recent interactions
document.getElementById("start-quiz-button").addEventListener("click", startQuizProcess);

async function extractTopicsFromHistory(interactions) {
  try {
    const response = await fetch("/extract-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interactions }),
    });

    const data = await response.json();
    console.log("Extracted Topics:", data.topics);

    const topics = Array.isArray(data.topics) ? data.topics : [];
    submitSettings(topics);
  } catch (error) {
    console.error("Error extracting topics:", error);
    return [];
  }
}

function submitSettings(extractedTopics) {
  // Remove start quiz button from screen
  document.getElementById("start-quiz-button").style.display = "none";

  const selectedTopics = Array.from(document.querySelectorAll('input[name="topic"]:checked')).map(
    (input) => input.value
  );
  const questionTypes = Array.from(document.querySelectorAll('input[name="question-type"]:checked')).map(
    (input) => input.value
  );
  const difficulty = document.getElementById("difficulty").value;

  const combinedTopics = [...new Set([...selectedTopics, ...extractedTopics])];
  console.log("Combined topics: " + combinedTopics);

  const data = {
    participantID: participantID,
    topics: combinedTopics,
    questionTypes: questionTypes,
    difficulty: difficulty,
  };

  console.log("Data to send:", data);

  fetch("/generate-question", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      displayQuestion(data.question);
      console.log("Generated Question:", data.question);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function displayQuestion(questionText) {
  // Split the response into sections based on "---"
  const sections = questionText.split("---");

  const questionSection = sections[0].trim();
  const answerSection = sections[1]?.replace("Correct Answer:", "").trim();
  const explanationSection = sections[2]?.replace("Brief Explanation:", "").trim();

  const questionLines = questionSection.split("\n");
  const question = questionLines[0].replace("**Question:** ", "").trim();
  const choices = questionLines.slice(1).filter((line) => line);

  const questionElement = document.querySelector("#question-area p");
  questionElement.textContent = question;

  // Clear previous q/a
  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";

  choices.forEach((choice) => {
    const choiceButton = document.createElement("button");
    choiceButton.textContent = choice.trim();
    choiceButton.classList.add("choice-button");
    choiceButton.onclick = () => checkAnswer(choice, answerSection, explanationSection);
    answersDiv.appendChild(choiceButton);
  });
}

function checkAnswer(selectedChoice, correctAnswer, explanation) {
  const isCorrect = selectedChoice.startsWith(correctAnswer);

  const feedbackText = document.getElementById("feedback-text");
  const feedbackExplanation = document.getElementById("feedback-explanation");

  feedbackText.textContent = isCorrect ? "Correct! 🎉" : "Incorrect. 😞";
  feedbackExplanation.textContent = `Explanation: ${explanation}`;

  document.getElementById("feedback").style.display = "block";
  document.getElementById("next-question-button").style.display = "block";
}

function loadNextQuestion() {
  document.querySelector("#question-area p").textContent = "";
  document.getElementById("feedback").style.display = "none";
  document.getElementById("next-question-button").style.display = "none";
  document.getElementById("answers").innerHTML = "";

  startQuizProcess();
}
