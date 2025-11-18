const API_BASE = "http://localhost:3000/api/watson";
const SESSION_KEY = "watson_permanent_session_id_1"; // A permanent key
const HISTORY_KEY = "watson_history_key"; //this key doesnt change its just here to store history resets on itself

let sessionId = null;

const chatWidget = document.getElementById("chat-widget");
const chatToggle = document.getElementById("chat-toggle");
const chatClose = document.getElementById("chat-close");
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("text");
const sendBtn = document.getElementById("send");
const btn = document.getElementById("EndSessionBtn");

//btn.addEventListener("click",endSession);

// chatbot visibility

// Chat is visible when the page loads
let isChatOpen = true;

if (chatToggle && chatWidget) {
    chatToggle.onclick = () => {
        // flip state
        isChatOpen = !isChatOpen;

        chatWidget.style.display = isChatOpen ? "flex" : "none";

        if (isChatOpen && inputEl) {
            inputEl.focus();
        }
    };
}

if (chatClose && chatWidget) {
    chatClose.onclick = () => {
        isChatOpen = false;
        chatWidget.style.display = "none";
    };
}

// save history to use when swapping pages
function saveHistory() {

    localStorage.setItem(HISTORY_KEY, chatEl.innerHTML);
    console.log("Saved chat:", chatEl.innerHTML);
}

// end session
function endSession() {
    console.log("Ending session and starting new one...");
    addMessage("Thank you. Session ending. Please wait.", "bot");
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(HISTORY_KEY);
    sessionId = null;

    setTimeout(() => {
        chatEl.innerHTML = "";
        initSession();
    }, 2000);
}


// create chat
async function initSession() {

    const existingId = localStorage.getItem(SESSION_KEY);
    const existingHistory = localStorage.getItem(HISTORY_KEY);

    if (existingId && existingHistory) {

        console.log("Restoring session and history:", existingId);
        sessionId = existingId;
        chatEl.innerHTML = existingHistory;
        chatEl.scrollTop = chatEl.scrollHeight;
        return;
    }


    console.log("No complete session found. Creating new one...");


    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(HISTORY_KEY);
    chatEl.innerHTML = ""; // Clear chat screen

    try {

        const res = await fetch(`${API_BASE}/session`);
        const data = await res.json();
        console.log("Session response:", data);

        sessionId = data.session_id || data.sessionId;
        if (!sessionId) {
            addMessage("Error: no session id from server.", "bot");
            return;
        }


        localStorage.setItem(SESSION_KEY, sessionId);
        console.log("Saved new permanent session:", sessionId);

        await requestWelcome();
    } catch (err) {
        console.error("initSession error:", err);
        addMessage("Could not contact assistant (session).", "bot");
    }
}

// welcome message
async function requestWelcome() {
    try {
        const res = await fetch(`${API_BASE}/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "session_id": sessionId
            },
            body: JSON.stringify({ input: "" })
        });

        const data = await res.json();
        console.log("Welcome response:", data);

        if (!res.ok) {
            addMessage("Hi, I'm your assistant. How can I help you today?", "bot");
            return;
        }

        renderOutput(data, true);
    } catch (err) {
        console.error("requestWelcome error:", err);
        addMessage("Hi, I'm your assistant. How can I help you today?", "bot");
    }
}


// messages
function addMessage(text, from = "bot") {
    const wrap = document.createElement("div");
    wrap.className = "msg " + from;

    const bubble = document.createElement("div");
    bubble.className = "bubble " + from;
    bubble.textContent = text;

    wrap.appendChild(bubble);
    chatEl.appendChild(wrap);
    chatEl.scrollTop = chatEl.scrollHeight;

    saveHistory();
}

function addOptions(options) {
    const wrap = document.createElement("div");
    wrap.className = "msg bot options";

    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.textContent = opt.label;
        btn.onclick = () => sendTextFromButton(opt.label);
        wrap.appendChild(btn);
    });

    chatEl.appendChild(wrap);
    chatEl.scrollTop = chatEl.scrollHeight;

    saveHistory();
}

function renderOutput(data, isWelcome = false) {
    console.log("Rendering output:", data);

    const output = data.output || {};
    const generic = output.generic || [];

    if (generic.length === 0) {
        if (isWelcome) {
            addMessage("Hi, I'm your assistant. How can I help you today?", "bot");
        } else if (data.error) {
            addMessage("Assistant error alpha: " + data.error, "bot");
        } else {
            addMessage("I didn't understand that.", "bot");
        }
        return;
    }

    generic.forEach(part => {
        console.log("Handling generic part:", part);

        if (part.response_type === "text" && part.text) {
            addMessage(part.text, "bot");
        } else if (part.response_type === "option" && part.options) {
            addOptions(part.options);
        } else if (part.response_type === "suggestion" && part.suggestions) {
            addMessage(part.title || "Did you mean:", "bot");
            const opts = part.suggestions.map(s => ({
                label: s.label,
                value: s.value
            }));
            addOptions(opts);
        } else {
            addMessage(`[${part.response_type}] ${JSON.stringify(part)}`, "bot");
        }
    });
}

// send text
async function sendText(text) {
    if (!text.trim()) return;

    addMessage(text, "user");
    inputEl.value = "";

    try {
        const res = await fetch(`${API_BASE}/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "session_id": sessionId
            },
            body: JSON.stringify({ input: text })
        });

        const data = await res.json();
        console.log("Watson response:", data);
        //check if its invalid session
        // if (!res.ok) {
        //     const raw = JSON.stringify(data);
        //     addMessage("Assistant error beta: " + (data.error || raw), "bot");
        //     return;
        // }

         if (!res.ok) {
            const raw = JSON.stringify(data);
            console.log(data.error || raw);
            if (data.error && data.error.toLowerCase().includes("invalid session")) {
                addMessage("Session expired. Starting a new session...", "bot");
                endSession();
                return;
            }
            addMessage("Assistant error beta: " + (data.error || raw), "bot");
            return;
        }

        const topIntent = data.output?.intents?.[0]?.intent;




        // redirect on specific intent
        if (topIntent === "action_39373_intent_26859") {
            window.location.href = "/NewHomePage.html";
        }
        if (topIntent === "General_Ending") {
            renderOutput(data, false);
            endSession();
            return;
        }


        renderOutput(data, false);
    } catch (err) {
        console.error("sendText error:", err);
        addMessage("Could not contact assistant (message).", "bot");
    }

    saveHistory();
}

async function sendTextFromButton(text) {
    // text from button
    if (!text.trim()) return;
    console.log("Button clicked with text:", text);
    addMessage(text, "user");
    inputEl.value = "";

    try {
        const res = await fetch(`${API_BASE}/message`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "session_id": sessionId
            },
            body: JSON.stringify({ input: text })
        });

        const data = await res.json();
        console.log("Watson response (from button):", data);

         if (!res.ok) {
            const raw = JSON.stringify(data);
            console.log(data.error || raw);
            if (data.error && data.error.toLowerCase().includes("invalid session")) {
                addMessage("Session expired. Starting a new session...", "bot");
                endSession();
                return;
            }
            addMessage("Assistant error beta: " + (data.error || raw), "bot");
            return;
        }
        const topIntent = data.output?.intents?.[0]?.intent;

        if (topIntent === "action_39373_intent_26859") {
            window.location.href = "/NewHomePage.html";
        }

        if (topIntent === "General_Ending") {
            renderOutput(data, false);
            endSession();
            return;
        }

        renderOutput(data, false);
    } catch (err) {
        console.error("sendTextFromButton error:", err);
        addMessage("Could not contact assistant (message).", "bot");
    }
}










if (sendBtn) {
    sendBtn.onclick = () => sendText(inputEl.value);
}
if (inputEl) {
    inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") sendText(inputEl.value);
    });
}

initSession();