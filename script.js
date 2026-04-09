/*
  Replace this URL with your deployed Cloudflare Worker endpoint.
  Example: https://something.workers.dev
*/
const WORKER_URL = "https://loreal-api.nidhilalwani01.workers.dev";

// DOM elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

const newChatBtn = document.getElementById("newChatBtn");
const chatHistoryList = document.getElementById("chatHistoryList");
const sidebarToggle = document.getElementById("sidebarToggle");
const chatSidebar = document.getElementById("chatSidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileHistoryModal = document.getElementById("mobileHistoryModal");
const mobileHistoryCloseBtn = document.getElementById("mobileHistoryCloseBtn");
const mobileHistoryList = document.getElementById("mobileHistoryList");
const mobileNewChatBtn = document.getElementById("mobileNewChatBtn");

const suggestedPrompts = [
  {
    label: "Dry skin routine",
    prompt: "Build me a morning skincare routine for dry skin.",
  },
  {
    label: "Everyday makeup",
    prompt: "Recommend a makeup look for a polished everyday finish.",
  },
  {
    label: "Smooth haircare",
    prompt: "What is a simple haircare routine for frizz and shine?",
  },
  {
    label: "Fragrance edit",
    prompt: "Suggest a fragrance style that feels elegant and fresh.",
  },
];
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
let conversationHistory = [SYSTEM_MESSAGE];

// Storage key for persisting chat history
const CONVERSATIONS_KEY = "loreal-chatbot-conversations";
let currentConversationId = null;
let conversations = {};

// Load all conversations from localStorage
function loadAllConversations() {
  const stored = localStorage.getItem(CONVERSATIONS_KEY);
  if (stored) {
    try {
      conversations = JSON.parse(stored);
    } catch (error) {
      console.error("Error loading conversations:", error);
      conversations = {};
    }
  }
}

// Save all conversations to localStorage
function saveAllConversations() {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

// Create a new conversation
function createNewConversation() {
  const id = Date.now().toString();
  conversations[id] = {
    id,
    title: "New Conversation",
    timestamp: new Date().toISOString(),
    messages: [],
  };
  currentConversationId = id;
  conversationHistory = [SYSTEM_MESSAGE];
  saveAllConversations();
  saveConversation();
  renderSidebar();
  renderEmptyState();
}

// Load a specific conversation
function loadConversation(id) {
  currentConversationId = id;
  if (!conversations[id]) {
    createNewConversation();
    return;
  }

  const conv = conversations[id];
  conversationHistory = [SYSTEM_MESSAGE, ...conv.messages];

  // Clear chat window and reload messages
  chatWindow.innerHTML = "";

  if (conv.messages.length === 0) {
    renderEmptyState();
  } else {
    chatWindow.classList.remove("is-empty");
    conv.messages.forEach((msg) => {
      if (msg.role !== "system") {
        appendMessage(msg.role, msg.content);
      }
    });
  }

  renderSidebar();
}

// Save current conversation
function saveConversation() {
  if (!currentConversationId || !conversations[currentConversationId]) return;

  const messages = conversationHistory.slice(1); // Exclude system message
  conversations[currentConversationId].messages = messages;

  // Update title from first user message if not set
  const firstUserMsg = messages.find((msg) => msg.role === "user");
  if (
    firstUserMsg &&
    conversations[currentConversationId].title === "New Conversation"
  ) {
    conversations[currentConversationId].title = firstUserMsg.content.substring(
      0,
      50,
    );
  }

  saveAllConversations();
}

// Delete a conversation
function deleteConversation(id, event) {
  event?.stopPropagation();
  if (confirm("Delete this conversation?")) {
    delete conversations[id];
    saveAllConversations();

    if (currentConversationId === id) {
      const convIds = Object.keys(conversations);
      if (convIds.length > 0) {
        loadConversation(convIds[0]);
      } else {
        createNewConversation();
      }
    }
    renderSidebar();
  }
}

function getSortedConversationIds() {
  return Object.keys(conversations).sort(
    (a, b) =>
      new Date(conversations[b].timestamp) -
      new Date(conversations[a].timestamp),
  );
}

// Render sidebar conversation list
function renderSidebar() {
  chatHistoryList.innerHTML = "";
  const convIds = getSortedConversationIds();

  convIds.forEach((id) => {
    const conv = conversations[id];
    const item = document.createElement("div");
    item.className = `conversation-item ${id === currentConversationId ? "active" : ""}`;
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-pressed", String(id === currentConversationId));

    const titleSpan = document.createElement("span");
    titleSpan.textContent = conv.title || "Untitled";
    titleSpan.style.flex = "1";
    titleSpan.style.textAlign = "left";
    item.appendChild(titleSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "conversation-delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "✕";
    deleteBtn.onclick = (e) => deleteConversation(id, e);
    attachPressFeedback(deleteBtn);
    item.appendChild(deleteBtn);

    item.onclick = () => loadConversation(id);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        loadConversation(id);
      }
    });
    attachPressFeedback(item);
    chatHistoryList.appendChild(item);
  });

  renderMobileHistoryList();
}

function renderMobileHistoryList() {
  if (!mobileHistoryList) return;

  mobileHistoryList.innerHTML = "";
  const convIds = getSortedConversationIds();

  if (convIds.length === 0) {
    const empty = document.createElement("div");
    empty.className = "mobile-history-empty";
    empty.textContent = "No conversations yet. Start a new chat.";
    mobileHistoryList.appendChild(empty);
    return;
  }

  convIds.forEach((id) => {
    const conv = conversations[id];
    const item = document.createElement("button");
    item.type = "button";
    item.className = `mobile-history-item ${
      id === currentConversationId ? "active" : ""
    }`;
    item.textContent = conv.title || "Untitled";
    item.addEventListener("click", () => {
      loadConversation(id);
      closeMobileHistoryModal();
    });
    mobileHistoryList.appendChild(item);
  });
}

function openMobileHistoryModal() {
  if (!mobileHistoryModal) return;

  renderMobileHistoryList();
  mobileHistoryModal.hidden = false;
  requestAnimationFrame(() => {
    mobileHistoryModal.classList.add("open");
  });
  document.body.classList.add("modal-open");
  if (mobileMenuBtn) {
    mobileMenuBtn.setAttribute("aria-expanded", "true");
  }
}

function closeMobileHistoryModal() {
  if (!mobileHistoryModal) return;

  mobileHistoryModal.classList.remove("open");
  document.body.classList.remove("modal-open");
  if (mobileMenuBtn) {
    mobileMenuBtn.setAttribute("aria-expanded", "false");
  }

  setTimeout(() => {
    if (!mobileHistoryModal.classList.contains("open")) {
      mobileHistoryModal.hidden = true;
    }
  }, 180);
}

// Clear chat history
function clearChatHistory() {
  if (confirm("Are you sure you want to clear all chat history?")) {
    conversations = {};
    localStorage.removeItem(CONVERSATIONS_KEY);
    createNewConversation();
  }
}

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

function smoothScrollChat() {
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: "smooth",
  });
}

function setEmptyState(active) {
  chatWindow.classList.toggle("is-empty", active);
}

function renderEmptyState() {
  chatWindow.innerHTML = "";
  setEmptyState(true);

  const emptyState = document.createElement("div");
  emptyState.className = "chat-empty-state";

  const kicker = document.createElement("p");
  kicker.className = "empty-kicker";
  kicker.textContent = "Beauty concierge";
  emptyState.appendChild(kicker);

  const title = document.createElement("h2");
  title.className = "empty-title";
  title.textContent =
    "Ask for a routine, recommendation, or quick beauty edit.";
  emptyState.appendChild(title);

  const copy = document.createElement("p");
  copy.className = "empty-copy";
  copy.textContent =
    "Try skincare, makeup, haircare, or fragrance questions. Suggested prompts are here to get you started.";
  emptyState.appendChild(copy);

  const promptGrid = document.createElement("div");
  promptGrid.className = "empty-prompt-grid";

  suggestedPrompts.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "empty-prompt";
    button.textContent = item.label;
    button.dataset.prompt = item.prompt;
    button.addEventListener("click", () => {
      applyPresetPrompt(item.prompt);
    });
    attachPressFeedback(button);
    promptGrid.appendChild(button);
  });

  emptyState.appendChild(promptGrid);
  chatWindow.appendChild(emptyState);
}

function clearEmptyState() {
  const emptyState = chatWindow.querySelector(".chat-empty-state");
  if (emptyState) {
    emptyState.remove();
  }
  setEmptyState(false);
}

function animatePress(element) {
  if (!element) return;

  element.classList.remove("press-pop");
  // Force reflow so the class retriggers on repeated quick clicks.
  void element.offsetWidth;
  element.classList.add("press-pop");
}

function attachPressFeedback(element) {
  if (!element) return;
  element.addEventListener("click", () => animatePress(element));
}

function typeTextIntoBubble(bubble, text, duration = 320) {
  return new Promise((resolve) => {
    const totalChars = Math.max(text.length, 1);
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const visibleChars = Math.max(1, Math.floor(totalChars * progress));
      bubble.textContent = text.slice(0, visibleChars);
      chatWindow.scrollTop = chatWindow.scrollHeight;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

async function appendMessage(role, text, options = {}) {
  const { animateTyping = false, highlight = false } = options;
  clearEmptyState();
  const message = document.createElement("div");
  message.className = `chat-bubble ${role} new-message`;

  if (role === "assistant" && animateTyping) {
    message.classList.add("is-typing");
    message.textContent = "";
  } else {
    message.textContent = text;
  }

  chatWindow.appendChild(message);
  smoothScrollChat();

  if (role === "assistant" && animateTyping) {
    await typeTextIntoBubble(message, text, 320);
    message.classList.remove("is-typing");
  }

  if (role === "assistant" && highlight) {
    message.classList.add("fresh-assistant");
    setTimeout(() => {
      message.classList.remove("fresh-assistant");
    }, 380);
  }

  setTimeout(() => {
    message.classList.remove("new-message", "press-pop");
  }, 420);

  return message;
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

  // Improve accessibility: announce state changes
  if (isSubmitting) {
    sendBtn.setAttribute("aria-busy", "true");
  } else {
    sendBtn.setAttribute("aria-busy", "false");
  }
}

function isBeautyRelatedQuestion(question) {
  const normalized = question.toLowerCase();
  return beautyKeywords.some((keyword) => normalized.includes(keyword));
}

function applyPresetPrompt(prompt) {
  userInput.value = prompt;
  userInput.focus();
  userInput.setSelectionRange(prompt.length, prompt.length);
}

function updateSidebarControls() {
  const isCollapsed = chatSidebar.classList.contains("collapsed");
  const label = isCollapsed ? "Open sidebar" : "Hide sidebar";

  sidebarToggle.setAttribute("aria-label", label);
  sidebarToggle.title = label;

  const labelEl = sidebarToggle.querySelector(".sidebar-toggle-label");
  if (labelEl) {
    labelEl.textContent = isCollapsed ? "Open" : "Hide";
  }
}

function toggleSidebar(forceState) {
  const shouldCollapse =
    typeof forceState === "boolean"
      ? forceState
      : !chatSidebar.classList.contains("collapsed");

  chatSidebar.classList.toggle("collapsed", shouldCollapse);
  updateSidebarControls();
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
  appendMessage("user", question);
  userInput.value = "";

  // Store user's new message in the shared conversation context.
  conversationHistory.push({ role: "user", content: question });
  saveConversation(); // Save to localStorage immediately

  // Refuse unrelated topics before making an API call.
  if (!isBeautyRelatedQuestion(question)) {
    const refusalMessage =
      "I can only help with L'Oréal beauty topics such as skincare, makeup, haircare, fragrances, and routines. Please share a beauty-related question, and I will gladly assist.";

    await appendMessage("assistant", refusalMessage, {
      animateTyping: true,
      highlight: true,
    });
    conversationHistory.push({ role: "assistant", content: refusalMessage });
    saveConversation(); // Save to localStorage
    return;
  }

  setSubmittingState(true);
  createLoadingBubble();

  try {
    const assistantReply = await fetchAssistantResponse(conversationHistory);
    removeLoadingBubble();

    await appendMessage("assistant", assistantReply, {
      animateTyping: true,
      highlight: true,
    });
    conversationHistory.push({ role: "assistant", content: assistantReply });
    saveConversation(); // Save to localStorage
  } catch (error) {
    removeLoadingBubble();

    const fallbackMessage =
      "I am having trouble reaching the beauty assistant right now. Please try again in a moment.";
    await appendMessage("assistant", fallbackMessage, {
      animateTyping: true,
      highlight: true,
    });

    console.error("Chat request error:", error);
  } finally {
    setSubmittingState(false);
    userInput.focus();
  }
}

// Initialize conversations on page load
loadAllConversations();

// Create first conversation if none exist
if (Object.keys(conversations).length === 0) {
  createNewConversation();
} else {
  // Load the most recent conversation
  const convIds = getSortedConversationIds();
  loadConversation(convIds[0]);
}

// Event listeners
chatForm.addEventListener("submit", handleSubmit);
newChatBtn.addEventListener("click", createNewConversation);
sidebarToggle.addEventListener("click", () => toggleSidebar());

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", openMobileHistoryModal);
}

if (mobileHistoryCloseBtn) {
  mobileHistoryCloseBtn.addEventListener("click", closeMobileHistoryModal);
}

if (mobileNewChatBtn) {
  mobileNewChatBtn.addEventListener("click", () => {
    createNewConversation();
    closeMobileHistoryModal();
  });
}

if (mobileHistoryModal) {
  mobileHistoryModal.addEventListener("click", (event) => {
    if (event.target === mobileHistoryModal) {
      closeMobileHistoryModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    mobileHistoryModal?.classList.contains("open")
  ) {
    closeMobileHistoryModal();
  }
});

attachPressFeedback(sendBtn);
attachPressFeedback(newChatBtn);
attachPressFeedback(sidebarToggle);
attachPressFeedback(mobileMenuBtn);
attachPressFeedback(mobileHistoryCloseBtn);
attachPressFeedback(mobileNewChatBtn);

updateSidebarControls();
