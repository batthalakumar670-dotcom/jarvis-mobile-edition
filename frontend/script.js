// ================================
// J.A.R.V.I.S
// ================================

// API KEY
let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");

  if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
  }
}

// Gemini models
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash"
];

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const voiceStatus = document.getElementById("voice-status");


// ================================
// GEMINI
// ================================

async function callGemini(prompt) {
  if (!API_KEY) {
    throw new Error("Gemini API key was not provided.");
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": API_KEY
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        lastError = new Error(
          data?.error?.message || `HTTP ${response.status}`
        );

        continue;
      }

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      return text;

    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}


// ================================
// ASK JARVIS
// ================================

async function askGemini(prompt) {
  add("J.A.R.V.I.S: Thinking...", "ai");

  try {
    const reply = await callGemini(prompt);

    if (chat.lastChild) {
      chat.lastChild.innerText = "J.A.R.V.I.S: " + reply;
    }

    speak(reply);

  } catch (error) {
    console.error(error);

    if (chat.lastChild) {
      chat.lastChild.innerText =
        "J.A.R.V.I.S: ERROR - " + error.message;
    }
  }
}


// ================================
// TEXT SEND
// ================================

function sendMessage() {
  const text = input.value.trim();

  if (!text) {
    return;
  }

  add("YOU: " + text, "user");

  input.value = "";

  askGemini(text);
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    sendMessage();
  }
});


// ================================
// SPEECH RECOGNITION
// ================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let rec = null;

if (SpeechRecognition) {

  rec = new SpeechRecognition();

  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = false;

  voiceStatus.textContent = "READY";
  voiceStatus.className = "on";

  rec.onstart = () => {
    micBtn.innerText = "LISTENING...";
    micBtn.disabled = true;
  };

  rec.onresult = event => {
    const text =
      event.results[0][0].transcript.trim();

    if (text) {
      add("YOU: " + text, "user");
      askGemini(text);
    }
  };

  rec.onerror = event => {
    console.error("Speech recognition error:", event.error);

    add(
      "J.A.R.V.I.S: Microphone error - " + event.error,
      "ai"
    );
  };

  rec.onend = () => {
    micBtn.innerText = "🎙️";
    micBtn.disabled = false;
  };

  micBtn.addEventListener("click", () => {
    try {
      rec.start();
    } catch (error) {
      console.error(error);
    }
  });

} else {

  micBtn.disabled = true;
  micBtn.title = "Speech recognition is not supported";

  voiceStatus.textContent = "UNAVAILABLE";
  voiceStatus.className = "off";
}


// ================================
// TEXT TO SPEECH
// ================================

let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

loadVoices();

if ("onvoiceschanged" in speechSynthesis) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.rate = 1.05;
  utterance.pitch = 0.85;

  const voice =
    voices.find(v => v.lang.startsWith("en"));

  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}


// ================================
// CHAT MESSAGE
// ================================

function add(text, type) {

  const message = document.createElement("div");

  message.className = "msg " + type;
  message.innerText = text;

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;
}


// ================================
// START MESSAGE
// ================================

add(
  "J.A.R.V.I.S: System initialized. How may I assist you?",
  "ai"
);
