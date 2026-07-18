/**
 * MaitriLearn Voice Tutor
 * STT: Web Speech API (browser built-in, free, no server)
 * TTS: Edge TTS on VPS (Indian English)
 */

// ── STT Setup ─────────────────────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let _recognition = null;
let _isListening  = false;

function initSTT() {
  if (!SpeechRecognition || _recognition) return !!_recognition;
  _recognition = new SpeechRecognition();
  _recognition.continuous     = false;
  _recognition.interimResults = true;
  _recognition.lang           = "en-IN";
  _recognition.maxAlternatives = 1;
  return true;
}

// ── Start mic listening ───────────────────────────────────────────────────────
window.startVoiceInput = function () {
  const input     = document.getElementById("voiceTutorInput");
  const micBtn    = document.getElementById("voiceMicBtn");
  const sttStatus = document.getElementById("sttStatus");

  if (!initSTT()) {
    if (sttStatus) {
      sttStatus.textContent = "Voice input not supported on this browser. Please type.";
      sttStatus.style.color = "var(--rose, #e11d48)";
    }
    return;
  }

  if (_isListening) {
    _recognition.stop();
    return;
  }

  _isListening = true;
  if (micBtn)    { micBtn.innerHTML = "🔴 Stop"; micBtn.style.background = "#e11d48"; }
  if (sttStatus) { sttStatus.textContent = "Listening... speak now 🎙"; sttStatus.style.color = "var(--amber, #d97706)"; }

  _recognition.onresult = (event) => {
    const last       = event.results[event.results.length - 1];
    const transcript = last[0].transcript;
    const isFinal    = last.isFinal;

    if (input) input.value = isFinal ? transcript : transcript + "...";

    if (isFinal) {
      _isListening = false;
      if (micBtn) { micBtn.innerHTML = "🎙 Speak"; micBtn.style.background = ""; }
      if (sttStatus) { sttStatus.textContent = `✓ Heard: "${transcript}"`; sttStatus.style.color = "var(--emerald, #059669)"; }
      // Auto-submit after STT completes
      setTimeout(() => generateVoiceTutor(), 300);
    }
  };

  _recognition.onerror = (event) => {
    _isListening = false;
    if (micBtn) { micBtn.innerHTML = "🎙 Speak"; micBtn.style.background = ""; }
    const msgs = {
      "not-allowed":  "Microphone permission denied. Please allow mic access.",
      "no-speech":    "No speech detected. Please try again.",
      "network":      "Network error. Please check connection.",
      "aborted":      "Listening stopped."
    };
    if (sttStatus) {
      sttStatus.textContent = msgs[event.error] || `Error: ${event.error}`;
      sttStatus.style.color = "var(--rose, #e11d48)";
    }
  };

  _recognition.onend = () => {
    _isListening = false;
    if (micBtn) { micBtn.innerHTML = "🎙 Speak"; micBtn.style.background = ""; }
  };

  try {
    _recognition.start();
  } catch (e) {
    _isListening = false;
    if (micBtn) { micBtn.innerHTML = "🎙 Speak"; micBtn.style.background = ""; }
    if (sttStatus) { sttStatus.textContent = "Could not start microphone."; }
  }
};

// ── Generate voice answer ─────────────────────────────────────────────────────
window.generateVoiceTutor = async function () {
  const prompt   = document.getElementById("voiceTutorInput")?.value?.trim();
  const status   = document.getElementById("voiceStatus");
  const errorEl  = document.getElementById("voiceError");
  const answerEl = document.getElementById("voiceAnswer");
  const player   = document.getElementById("voicePlayer");
  const resultEl = document.getElementById("voiceResult");

  if (!prompt) { alert("Please speak or type a question first"); return; }

  if (status)  { status.className  = "vstatus thinking"; status.textContent = "🤔 Thinking..."; }
  if (errorEl) { errorEl.className = "terror"; errorEl.textContent = ""; }
  if (answerEl){ answerEl.textContent = ""; }
  if (resultEl){ resultEl.classList.remove("show"); }

  try {
    // Step 1: Get AI answer + audio URL from VPS
    const res = await fetch(`${VOICE_TUTOR_URL}/generate`, {
      method:  "POST",
      headers: {
        "Content-Type":               "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      // New: /generate can now fail at the TTS step after already producing
      // a valid AI answer (tts_failed). Show the text instead of a dead end.
      const errData = await res.json().catch(() => ({}));
      if (errData.error === "tts_failed" && errData.text) {
        if (answerEl) answerEl.textContent = errData.text;
        if (resultEl) resultEl.classList.add("show");
        if (status)   { status.className = "vstatus"; status.textContent = ""; }
        if (errorEl)  {
          errorEl.textContent = "🎤 Voice playback is temporarily unavailable — showing text answer instead.";
          errorEl.classList.add("show");
        }
        return;
      }
      throw new Error("status_" + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (answerEl) answerEl.textContent = data.text;
    if (status)   { status.className = "vstatus playing"; status.textContent = "Playing... 🔊"; }
    if (resultEl) resultEl.classList.add("show");

    // Step 2: Fetch audio as blob — bypasses ngrok/proxy interception on mobile
    const audioUrl = data.audio_url || `${VOICE_TUTOR_URL}${data.audio}`;
    const audioRes = await fetch(audioUrl, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!audioRes.ok) throw new Error("Audio fetch failed: " + audioRes.status);

    const audioBlob = await audioRes.blob();
    const blobUrl   = URL.createObjectURL(audioBlob);

    if (player) {
      player.src     = blobUrl;
      player.onended = () => URL.revokeObjectURL(blobUrl);
      await player.play();
    }

    if (status) { status.className = "vstatus done"; status.textContent = "Done ✅"; }

  } catch (error) {
    if (status) { status.className = "vstatus"; status.textContent = ""; }
    const msg = error.message;
    let display = "🎤 Voice Tutor unavailable: " + msg;
    if (msg.includes("Failed to fetch") || msg.includes("ERR_CONNECTION_REFUSED")) {
      display = "🎤 Voice Tutor is offline. Please check VPS is running.";
    } else if (msg.includes("status_503")) {
      display = "🎤 Voice Tutor is starting up, please try again.";
    } else if (msg.includes("status_")) {
      display = "🎤 Voice Tutor error. Please try again.";
    }
    if (errorEl) { errorEl.textContent = display; errorEl.classList.add("show"); }
  }
};
