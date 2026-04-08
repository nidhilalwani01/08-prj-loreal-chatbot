/*
  Replace this URL with your deployed Cloudflare Worker endpoint.
  Example: https://something.workers.dev
*/
const WORKER_URL = "https://something.workers.dev";

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const latestQuestionText = document.getElementById("latestQuestionText");

/*
  This system message defines the assistant's behavior and keeps responses
  focused on L'Oréal beauty topics.
*/
const SYSTEM_MESSAGE = {
  role: "system",
  content:
    "You are a L'Oréal beauty assistant chatbot. Help users explore L'Oréal products in skincare, makeup, haircare, and fragrances. Suggest simple routines based on user needs and provide clear, helpful beauty advice. Only answer questions related to L'Oréal, beauty, skincare, makeup, haircare, fragrance, and routines. If a question is unrelated, politely refuse and guide the user back to beauty topics. Do not invent product names or product claims if unsure. Keep answers concise, friendly, professional, warm, and premium. For sensitive skin questions or routines, remind users to patch test and check ingredients.",
};

// Keep full conversation history so the model can answer follow-up questions.
const conversationHistory = [SYSTEM_MESSAGE];

// Simple keyword filter for fast client-side refusal of unrelated topics.
const beautyKeywords = [
  "loreal",
  "l'oréal",
  "skincare",
  "skin",
  "serum",
  "cleanser",
  "moisturizer",
  "hair",
  "haircare",
  "shampoo",
  "conditioner",
  "makeup",
  "foundation",
  "mascara",
  "lipstick",
  "fragrance",
  "perfume",
  "beauty",
  "routine",
  "spf",
  "sunscreen",
  "anti-aging",
  "color",
  "dye",
];

function appendMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-bubble ${role}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function createLoadingBubble() {
  const loading = document.createElement("div");
  loading.className = "loading-bubble";
  loading.setAttribute("id", "loadingBubble");

  const label = document.createElement("span");
  label.className = "loading-label";
  label.textContent = "Thinking";
  loading.appendChild(label);

  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement("span");
    dot.className = "loading-dot";
    loading.appendChild(dot);
  }

  chatWindow.appendChild(loading);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeLoadingBubble() {
  const loadingBubble = document.getElementById("loadingBubble");
  if (loadingBubble) {
    loadingBubble.remove();
  }
}

function setSubmittingState(isSubmitting) {
  sendBtn.disabled = isSubmitting;
  userInput.disabled = isSubmitting;
  sendBtn.textContent = isSubmitting ? "Sending..." : "Send";
}

function isBeautyRelatedQuestion(question) {
  const normalized = question.toLowerCase();
  return beautyKeywords.some((keyword) => normalized.includes(keyword));
}

async function fetchAssistantResponse(messages) {
  if (WORKER_URL.includes("your-worker-url")) {
    throw new Error("Please add your Cloudflare Worker URL in script.js.");
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const assistantText = data.choices[0].message.content;

  if (!assistantText) {
    throw new Error("The API response did not include message content.");
  }

  return assistantText;
}

async function handleSubmit(event) {
  event.preventDefault();

  const question = userInput.value.trim();
  if (!question) {
    return;
  }

  latestQuestionText.textContent = question;
  appendMessage("user", question);
  userInput.value = "";

  // Store user's new message in the shared conversation context.
  conversationHistory.push({ role: "user", content: question });

  // Refuse unrelated topics before making an API call.
  if (!isBeautyRelatedQuestion(question)) {
    const refusalMessage =
      "I can only help with L'Oréal beauty topics such as skincare, makeup, haircare, fragrances, and routines. Please share a beauty-related question, and I will gladly assist.";

    appendMessage("assistant", refusalMessage);
    conversationHistory.push({ role: "assistant", content: refusalMessage });
    return;
  }

  setSubmittingState(true);
  createLoadingBubble();

  try {
    const assistantReply = await fetchAssistantResponse(conversationHistory);
    removeLoadingBubble();

    appendMessage("assistant", assistantReply);
    conversationHistory.push({ role: "assistant", content: assistantReply });
  } catch (error) {
    removeLoadingBubble();

    const fallbackMessage =
      "I am having trouble reaching the beauty assistant right now. Please try again in a moment.";
    appendMessage("assistant", fallbackMessage);

    console.error("Chat request error:", error);
  } finally {
    setSubmittingState(false);
    userInput.focus();
  }
}

// Initial greeting from the assistant.
appendMessage(
  "assistant",
  "Welcome to L'Oréal Beauty Concierge. I can help with L'Oréal skincare, haircare, makeup, fragrance recommendations, and simple routines.",
);

chatForm.addEventListener("submit", handleSubmit);
