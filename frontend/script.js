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


// Gemini models
const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
];


// ==================== DOM ====================

const chat =
    document.getElementById("chat");

const input =
    document.getElementById("msg");

const sendBtn =
    document.getElementById("send");

const micBtn =
    document.getElementById("mic-btn");

const camBtn =
    document.getElementById("cam-btn");

const clearBtn =
    document.getElementById("clear-btn");

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

    try {

        localStorage.setItem(
            "jarvis_memory",
            JSON.stringify(MEMORY)
        );

    } catch (error) {

        console.error(
            "Memory save failed:",
            error
        );
    }
}


// ==================== MESSAGE ====================

function addMessage(
    text,
    type
) {

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


function add(text, type) {

    return addMessage(
        text,
        type
    );
}


// ==================== LOAD MEMORY ====================

MEMORY.forEach(message => {

    if (
        !message ||
        !message.text
    ) {
        return;
    }


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


    if (
        !prompt ||
        !prompt.trim()
    ) {

        throw new Error(
            "Empty message."
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


    let lastError = null;


    for (
        const model of MODELS
    ) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                encodeURIComponent(model) +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY);


            const response =
                await fetch(
                    url,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                contents:
                                    contents
                            })

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                data.error
            ) {

                const message =
                    data?.error?.message ||
                    `HTTP ${response.status}`;


                lastError =
                    new Error(message);


                if (
                    /quota|rate|busy|unavailable|temporary|deprecated|not found|not supported/i
                        .test(message)
                ) {

                    continue;
                }


                throw lastError;
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
                    "Gemini returned no text."
                );
            }


            return reply;


        } catch (error) {

            lastError = error;

            console.warn(
                "Gemini model failed:",
                model,
                error
            );
        }

    }


    throw (
        lastError ||
        new Error(
            "All Gemini models failed."
        )
    );
}


// ==================== ASK JARVIS ====================

async function askGemini(prompt) {

    const thinking =
        addMessage(
            "J.A.R.V.I.S: Thinking...",
            "ai"
        );


    try {

        const reply =
            await callGemini(prompt);


        MEMORY.push({
            role: "user",
            text: prompt
        });


        MEMORY.push({
            role: "model",
            text: reply
        });


        if (
            MEMORY.length > 50
        ) {

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
            (
                error?.message ||
                "Unknown error"
            );
    }
}


// ==================== SEND ====================

async function sendMessage() {

    const text =
        input?.value?.trim();


    if (!text) return;


    addMessage(
        "YOU: " + text,
        "user"
    );


    input.value = "";


    await askGemini(text);
}


if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}


// Enter key
if (input) {

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                sendMessage();
            }

        }
    );
}


// ==================== CAMERA ====================

if (
    camBtn &&
    imgInput
) {

    camBtn.addEventListener(
        "click",
        () => {

            imgInput.click();

        }
    );


    imgInput.addEventListener(
        "change",
        () => {

            const file =
                imgInput.files?.[0];


            if (!file) return;


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                addMessage(
                    "J.A.R.V.I.S: Please select an image.",
                    "ai"
                );

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                () => {

                    const result =
                        reader.result;


                    if (
                        typeof result !==
                            "string" ||
                        !result.includes(",")
                    ) {

                        addMessage(
                            "J.A.R.V.I.S: Could not read image.",
                            "ai"
                        );

                        return;
                    }


                    const base64 =
                        result.split(",")[1];


                    const question =
                        input?.value?.trim() ||
                        "What do you see in this image? Describe it briefly.";


                    addMessage(
                        "YOU: [IMAGE] " +
                        question,
                        "user"
                    );


                    input.value = "";


                    askVision(
                        base64,
                        file.type,
                        question
                    );

                };


            reader.readAsDataURL(
                file
            );


            // Allow same image again
            imgInput.value = "";

        }
    );

}


// ==================== VISION ====================

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


    let lastError = null;


    for (
        const model of MODELS
    ) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                encodeURIComponent(model) +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY);


            const response =
                await fetch(
                    url,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                contents: [

                                    {
                                        role:
                                            "user",

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
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                data.error
            ) {

                const errorMessage =
                    data?.error?.message ||
                    `HTTP ${response.status}`;


                lastError =
                    new Error(
                        errorMessage
                    );


                if (
                    /quota|rate|busy|unavailable|temporary|deprecated|not found|not supported/i
                        .test(errorMessage)
                ) {

                    continue;
                }


                throw lastError;
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
                    "No image response received."
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


            if (
                MEMORY.length > 50
            ) {

                MEMORY =
                    MEMORY.slice(-50);
            }


            saveMemory();


            speak(reply);


            return;


        } catch (error) {

            lastError = error;

            console.warn(
                "Vision failed:",
                error
            );
        }

    }


    message.textContent =
        "J.A.R.V.I.S: ERROR - " +
        (
            lastError?.message ||
            "Image analysis failed."
        );
}


// ==================== VOICE ====================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (
    SpeechRecognition &&
    micBtn
) {

    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-US";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onstart =
        () => {

            micBtn.textContent =
                "LISTENING...";
        };


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
        event => {

            console.warn(
                "Voice error:",
                event.error
            );

        };


    recognition.onend =
        () => {

            micBtn.textContent =
                "🎙";
        };


    micBtn.addEventListener(
        "click",
        () => {

            try {

                recognition.start();

            } catch (error) {

                console.warn(
                    "Voice could not start:",
                    error
                );

            }

        }
    );

} else if (micBtn) {

    micBtn.addEventListener(
        "click",
        () => {

            addMessage(
                "J.A.R.V.I.S: Voice input is not supported in this browser.",
                "ai"
            );

        }
    );

}


// ==================== TEXT TO SPEECH ====================

let voices = [];


function loadVoices() {

    if (
        "speechSynthesis" in window
    ) {

        voices =
            speechSynthesis.getVoices();
    }
}


if (
    "speechSynthesis" in window
) {

    loadVoices();

    speechSynthesis.onvoiceschanged =
        loadVoices;
}


function speak(text) {

    if (
        !text ||
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }


    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.rate =
        1.05;


    utterance.pitch =
        0.85;


    const voice =
        voices.find(
            v =>
                v.lang &&
                v.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    if (voice) {

        utterance.voice =
            voice;
    }


    speechSynthesis.speak(
        utterance
    );
}


// ==================== CLEAR MEMORY ====================

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Clear all J.A.R.V.I.S memory?"
                );


            if (!confirmed) {
                return;
            }


            MEMORY = [];


            saveMemory();


            chat.innerHTML =
                "";


            addMessage(
                "SYSTEM: Memory cleared.",
                "ai"
            );

        }
    );

      }
