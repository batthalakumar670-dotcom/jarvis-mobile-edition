// ======================================================
// J.A.R.V.I.S MOBILE EDITION
// ======================================================


// ==================== CONFIG ====================

let API_KEY =
    localStorage.getItem("jarvis_key");

if (!API_KEY) {

    API_KEY = prompt(
        "Enter your Gemini API Key:"
    );

    if (API_KEY) {
        localStorage.setItem(
            "jarvis_key",
            API_KEY
        );
    }
}


const MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite"
];

// ==================== ELEMENTS ====================

const chat =
    document.getElementById("chat");

const input =
    document.getElementById("msg");

const sendBtn =
    document.getElementById("send");

const imgInput =
    document.getElementById("img-input");


// ==================== MEMORY ====================

let MEMORY = [];

try {

    MEMORY = JSON.parse(
        localStorage.getItem(
            "jarvis_memory"
        ) || "[]"
    );

    if (!Array.isArray(MEMORY)) {
        MEMORY = [];
    }

} catch {

    MEMORY = [];
}


function saveMemory() {

    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
    );
}


// ==================== MESSAGE ====================

function addMessage(text, type) {

    if (!chat) return null;

    const div =
        document.createElement("div");

    div.className =
        "msg " + type;

    div.textContent = text;

    chat.appendChild(div);

    chat.scrollTop =
        chat.scrollHeight;

    return div;
}


// ==================== OLD MEMORY ====================

MEMORY.forEach(message => {

    if (!message?.text) return;

    const prefix =
        message.role === "user"
            ? "YOU: "
            : "J.A.R.V.I.S: ";

    addMessage(
        prefix + message.text,
        message.role === "user"
            ? "user"
            : "ai"
    );
});


// ==================== GEMINI ====================

async function callGemini(prompt) {

    if (!API_KEY) {
        throw new Error(
            "Gemini API key is missing."
        );
    }


    const contents =
        MEMORY
            .slice(-12)
            .map(message => ({

                role:
                    message.role === "model"
                        ? "model"
                        : "user",

                parts: [
                    {
                        text:
                            String(
                                message.text
                            )
                    }
                ]

            }));


    contents.push({

        role: "user",

        parts: [
            {
                text: prompt
            }
        ]

    });


    let lastError;


    for (const model of MODELS) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY);


            const response =
                await fetch(url, {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        contents
                    })

                });


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data?.error?.message ||
                    `HTTP ${response.status}`
                );
            }


            const reply =
                data
                    ?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        part =>
                            part.text || ""
                    )
                    .join("")
                    .trim();


            if (!reply) {

                throw new Error(
                    "No response from Gemini."
                );
            }


            return reply;


        } catch (error) {

            lastError = error;

            console.warn(
                model,
                error
            );
        }
    }


    throw (
        lastError ||
        new Error(
            "Gemini request failed."
        )
    );
}


// ==================== CHAT ====================

async function askGemini(text) {

    const thinking =
        addMessage(
            "J.A.R.V.I.S: Thinking...",
            "ai"
        );


    try {

        const reply =
            await callGemini(text);


        MEMORY.push({
            role: "user",
            text
        });


        MEMORY.push({
            role: "model",
            text: reply
        });


        if (MEMORY.length > 50) {
            MEMORY =
                MEMORY.slice(-50);
        }


        saveMemory();


        thinking.textContent =
            "J.A.R.V.I.S: " +
            reply;


        speak(reply);


    } catch (error) {

        console.error(error);

        thinking.textContent =
            "J.A.R.V.I.S: ERROR - " +
            error.message;
    }
}


// ==================== SEND ====================

function sendMessage() {

    const text =
        input.value.trim();

    if (!text) return;


    addMessage(
        "YOU: " + text,
        "user"
    );


    input.value = "";


    askGemini(text);
}


sendBtn.addEventListener(
    "click",
    sendMessage
);


// Enter key

input.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }

    }
);


// ======================================================
// BUTTON EVENT DELEGATION
// ======================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) return;


        // ==================== MIC ====================

        if (
            button.id === "mic-btn"
        ) {

            startVoice();

            return;
        }


        // ==================== CAMERA ====================

        if (
            button.id === "cam-btn"
        ) {

            if (imgInput) {
                imgInput.click();
            }

            return;
        }


        // ==================== CLEAR ====================

        if (
            button.id === "clear-btn"
        ) {

            clearMemory();

            return;
        }

    }
);


// ==================== CLEAR MEMORY ====================

function clearMemory() {

    const confirmClear =
        confirm(
            "Clear all J.A.R.V.I.S memory?"
        );


    if (!confirmClear) return;


    MEMORY = [];

    saveMemory();


    chat.innerHTML = "";


    addMessage(
        "SYSTEM: Memory cleared.",
        "ai"
    );
}


// ======================================================
// IMAGE / CAMERA
// ======================================================

if (imgInput) {

    imgInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];

            if (!file) return;

            if (!file.type.startsWith("image/")) {

                addMessage(
                    "J.A.R.V.I.S: Please select an image.",
                    "ai"
                );

                return;
            }

            const reader =
                new FileReader();

            reader.onload = async () => {

                const result =
                    reader.result;

                if (
                    typeof result !== "string"
                ) {
                    return;
                }

                const base64 =
                    result.split(",")[1];

                const question =
                    input.value.trim() ||
                    "Describe this image.";

                // Show the actual photo in chat
                const userMessage =
                    document.createElement("div");

                userMessage.className =
                    "msg user";

                const label =
                    document.createElement("div");

                label.textContent =
                    "YOU: 📷";

                userMessage.appendChild(label);

                const image =
                    document.createElement("img");

                image.src = result;

                image.alt =
                    "Captured image";

                image.style.maxWidth =
                    "100%";

                image.style.width =
                    "280px";

                image.style.borderRadius =
                    "12px";

                image.style.marginTop =
                    "8px";

                image.style.display =
                    "block";

                userMessage.appendChild(image);

                const questionText =
                    document.createElement("div");

                questionText.textContent =
                    question;

                questionText.style.marginTop =
                    "8px";

                userMessage.appendChild(
                    questionText
                );

                chat.appendChild(
                    userMessage
                );

                chat.scrollTop =
                    chat.scrollHeight;

                input.value = "";

                // Send image to Gemini
                await askVision(
                    base64,
                    file.type,
                    question
                );
            };

            reader.onerror = () => {

                addMessage(
                    "J.A.R.V.I.S: Failed to read the image.",
                    "ai"
                );
            };

            reader.readAsDataURL(file);

            // Allow the same image to be selected again
            event.target.value = "";
        }
    );
}


// ======================================================
// VISION
// ======================================================

async function askVision(
    base64,
    mimeType,
    question
) {

    const message =
        addMessage(
            "J.A.R.V.I.S: Analyzing image...",
            "ai"
        );

    try {

// ======================================================
// IMAGE / CAMERA
// ======================================================

if (imgInput) {

    imgInput.addEventListener("change", function(event) {

        const file = event.target.files?.[0];

        // Reset immediately so the same photo can be selected again
        event.target.value = "";

        if (!file) {
            addMessage(
                "J.A.R.V.I.S: No photo received.",
                "ai"
            );
            return;
        }

        // Show immediately that JARVIS received the photo
        addMessage(
            "YOU: 📷 Photo received. Processing...",
            "user"
        );

        // Check image
        if (!file.type || !file.type.startsWith("image/")) {

            addMessage(
                "J.A.R.V.I.S: This file is not a supported image.",
                "ai"
            );

            return;
        }

        const reader = new FileReader();

        reader.onload = async function() {

            try {

                const result = reader.result;

                if (typeof result !== "string") {
                    throw new Error(
                        "Could not read the photo."
                    );
                }

                const base64 =
                    result.split(",")[1];

                if (!base64) {
                    throw new Error(
                        "Photo data is empty."
                    );
                }

                // Show actual image in chat
                const userMessage =
                    document.createElement("div");

                userMessage.className =
                    "msg user";

                const label =
                    document.createElement("div");

                label.textContent =
                    "YOU: 📷";

                userMessage.appendChild(label);

                const image =
                    document.createElement("img");

                image.src = result;
                image.alt = "Captured photo";

                image.style.width = "280px";
                image.style.maxWidth = "100%";
                image.style.borderRadius = "12px";
                image.style.marginTop = "8px";
                image.style.display = "block";

                userMessage.appendChild(image);

                chat.appendChild(userMessage);

                chat.scrollTop =
                    chat.scrollHeight;

                const question =
                    input.value.trim() ||
                    "Describe this image.";

                input.value = "";

                // Send to Gemini
                await askVision(
                    base64,
                    file.type,
                    question
                );

            } catch (error) {

                console.error(
                    "Photo processing error:",
                    error
                );

                addMessage(
                    "J.A.R.V.I.S: ERROR - " +
                    error.message,
                    "ai"
                );
            }
        };

        reader.onerror = function() {

            addMessage(
                "J.A.R.V.I.S: Failed to read the photo.",
                "ai"
            );
        };

        reader.readAsDataURL(file);
    });
}


// ======================================================
// VISION
// ======================================================

async function askVision(
    base64,
    mimeType,
    question
) {

    const message =
        addMessage(
            "J.A.R.V.I.S: Analyzing image...",
            "ai"
        );

    try {

        if (!API_KEY) {
            throw new Error(
                "Gemini API key is missing."
            );
        }

        let lastError;

        for (const model of MODELS) {

            try {

                const url =
                    "https://generativelanguage.googleapis.com/v1beta/models/" +
                    model +
                    ":generateContent?key=" +
                    encodeURIComponent(API_KEY);

                const response =
                    await fetch(url, {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            contents: [

                                {
                                    role: "user",

                                    parts: [

                                        {
                                            text:
                                                question
                                        },

                                        {
                                            inline_data: {
                                                mime_type:
                                                    mimeType,

                                                data:
                                                    base64
                                            }
                                        }

                                    ]
                                }

                            ]

                        })
                    });

                const data =
                    await response.json();

                if (!response.ok) {

                    throw new Error(
                        data?.error?.message ||
                        `HTTP ${response.status}`
                    );
                }

                const reply =
                    data
                        ?.candidates?.[0]
                        ?.content?.parts
                        ?.map(
                            part =>
                                part.text || ""
                        )
                        .join("")
                        .trim();

                if (!reply) {

                    throw new Error(
                        "Gemini returned no image response."
                    );
                }

                message.textContent =
                    "J.A.R.V.I.S: " +
                    reply;

                MEMORY.push({
                    role: "user",
                    text:
                        "[Image] " +
                        question
                });

                MEMORY.push({
                    role: "model",
                    text: reply
                });

                if (MEMORY.length > 50) {
                    MEMORY =
                        MEMORY.slice(-50);
                }

                saveMemory();

                speak(reply);

                return;

            } catch (error) {

                lastError = error;

                console.warn(
                    "Vision model failed:",
                    model,
                    error
                );
            }
        }

        throw (
            lastError ||
            new Error(
                "Image analysis failed."
            )
        );

    } catch (error) {

        console.error(
            "Vision error:",
            error
        );

        message.textContent =
            "J.A.R.V.I.S: ERROR - " +
            error.message;
    }
}
                }

                const reply =
                    data
                        ?.candidates?.[0]
                        ?.content?.parts
                        ?.map(
                            part =>
                                part.text || ""
                        )
                        .join("")
                        .trim();

                if (!reply) {

                    throw new Error(
                        "Gemini returned no image response."
                    );
                }

                // Show Gemini response
                message.textContent =
                    "J.A.R.V.I.S: " +
                    reply;

                // Save image conversation
                MEMORY.push({
                    role: "user",
                    text:
                        "[Image] " +
                        question
                });

                MEMORY.push({
                    role: "model",
                    text: reply
                });

                if (MEMORY.length > 50) {
                    MEMORY =
                        MEMORY.slice(-50);
                }

                saveMemory();

                speak(reply);

                return;

            } catch (error) {

                lastError =
                    error;

                console.warn(
                    "Vision model failed:",
                    model,
                    error
                );
            }
        }

        throw (
            lastError ||
            new Error(
                "Image analysis failed."
            )
        );

    } catch (error) {

        console.error(
            "Vision error:",
            error
        );

        message.textContent =
            "J.A.R.V.I.S: ERROR - " +
            error.message;
    }
}
// ======================================================
// VOICE
// ======================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


function startVoice() {

    if (!SpeechRecognition) {

        addMessage(
            "J.A.R.V.I.S: Voice recognition is not supported in this browser.",
            "ai"
        );

        return;
    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-US";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    const mic =
        document.getElementById(
            "mic-btn"
        );


    if (mic) {
        mic.textContent =
            "LISTENING...";
    }


    recognition.onresult =
        event => {

            const text =
                event
                    ?.results?.[0]?.[0]
                    ?.transcript;


            if (!text) return;


            addMessage(
                "YOU: " + text,
                "user"
            );


            askGemini(text);
        };


    recognition.onerror =
        error => {

            console.warn(
                "Voice error:",
                error.error
            );
        };


    recognition.onend =
        () => {

            const mic =
                document.getElementById(
                    "mic-btn"
                );


            if (mic) {
                mic.textContent =
                    "🎙";
            }
        };


    try {

        recognition.start();

    } catch (error) {

        console.warn(error);

    }
}


// ======================================================
// TEXT TO SPEECH
// ======================================================

function speak(text) {

    if (
        !text ||
        !window.speechSynthesis
    ) {
        return;
    }


    speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.rate =
        1.05;


    speech.pitch =
        0.85;


    speechSynthesis.speak(
        speech
    );
}
