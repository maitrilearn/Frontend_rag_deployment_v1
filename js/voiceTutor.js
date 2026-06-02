window.generateVoiceTutor = async function () {
  const prompt   = document.getElementById("voiceTutorInput").value;
  if (!prompt) { alert("Enter a question first"); return; }

  const status   = document.getElementById("voiceStatus");
  const errorEl  = document.getElementById("voiceError");
  const answerEl = document.getElementById("voiceAnswer");
  const player   = document.getElementById("voicePlayer");

  status.innerText   = "Thinking... 🤔";
  errorEl.innerText  = "";
  answerEl.innerText = "";

  try {
    const res = await fetch(`${VOICE_TUTOR_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) throw new Error("status_" + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    answerEl.innerText = data.text;
    player.src = `${VOICE_TUTOR_URL}${data.audio}`;
    player.play();
    status.innerText = "Done ✅";

  } catch (error) {
    status.innerText = "";

    // Bug Fix 7: Student-friendly error messages
    const msg = error.message;
    if (msg.includes("Failed to fetch") || msg.includes("ERR_CONNECTION_REFUSED")) {
      errorEl.innerText = "🎤 Voice Tutor is not available right now. Try the AI Tutor above instead.";
    } else if (msg.includes("status_503")) {
      errorEl.innerText = "🎤 Voice Tutor is starting up, please try again in a moment.";
    } else if (msg.includes("status_")) {
      errorEl.innerText = "🎤 Voice Tutor encountered an error. Try the AI Tutor above instead.";
    } else {
      errorEl.innerText = "🎤 Voice Tutor unavailable: " + msg;
    }
  }
};
