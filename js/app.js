console.log("MaitriLearn Started 🚀");

// BUG FIX: Removed duplicate SUPABASE_URL / SUPABASE_KEY / BACKEND_URL constants
// that were pasted here — they now live only in config.js

async function uploadNote() {
  const file = document.getElementById("fileInput").files[0];

  if (!file) {
    alert("Please select a file first");
    return;
  }

  try {
    await uploadNoteService(file, {
      student_class: document.getElementById("classInput").value,
      subject: document.getElementById("subjectInput").value,
      topic: document.getElementById("topicInput").value
    });
    alert("Uploaded Successfully");
  } catch (err) {
    console.error(err);
    alert("Upload failed. Please try again.");
  }
}

async function searchNotes() {
  const search = document.getElementById("searchInput").value;
  const list = document.getElementById("notesList");

  try {
    const notes = await searchNotesService(search);
    list.innerHTML = "";

    if (notes.length === 0) {
      list.innerHTML = "<p>No notes found.</p>";
      return;
    }

    notes.forEach(note => {
      const url = note.url || "#";
      list.innerHTML += `
        <div style="border:1px solid #ddd;padding:12px;border-radius:8px;margin-bottom:10px">
          <h3 style="margin-bottom:6px">${note.topic || "Untitled"}</h3>
          <div style="font-size:13px;color:#666;margin-bottom:8px">
            ${note.subject ? "Subject: " + note.subject + " | " : ""}
            ${note.student_class ? "Class: " + note.student_class : ""}
          </div>
          ${url !== "#"
            ? `<a href="${url}" target="_blank" style="margin-right:12px">📄 Preview</a>
               <a href="${url}" download>⬇ Download</a>`
            : "<span style='color:#999'>No file attached</span>"
          }
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = "<p class='error-msg'>Search failed. Please try again.</p>";
  }
}

async function askDoubt(event) {
  const btn = event.target;
  const errorEl = document.getElementById("doubtError");
  const outputEl = document.getElementById("doubtOutput");

  btn.disabled = true;
  btn.innerText = "Thinking...";
  errorEl.innerText = "";
  outputEl.innerText = "";

  try {
    const result = await askDoubtAPI(
      document.getElementById("doubtQuestion").value,
      document.getElementById("doubtSubject").value,
      document.getElementById("doubtTopic").value
    );

    // BUG FIX: Check for error field in response before accessing .answer
    if (result.error) {
      errorEl.innerText = "Error: " + result.error;
    } else {
      outputEl.innerText = result.answer;
    }
  } catch (err) {
    console.error(err);
    errorEl.innerText = "Could not reach server. Is the backend running?";
  }

  btn.disabled = false;
  btn.innerText = "Ask";
}

async function runTutor(event) {
  const btn = event.target;
  const errorEl = document.getElementById("tutorError");
  const outputEl = document.getElementById("tutorOutput");

  btn.disabled = true;
  btn.innerText = "Teaching...";
  errorEl.innerText = "";
  outputEl.innerText = "";

  try {
    const result = await tutorAPI(
      document.getElementById("tutorTopic").value
    );

    // BUG FIX: Check for error field before accessing .answer
    if (result.error) {
      errorEl.innerText = "Error: " + result.error;
    } else {
      outputEl.innerText = result.answer;
    }
  } catch (err) {
    console.error(err);
    errorEl.innerText = "Could not reach server. Is the backend running?";
  }

  btn.disabled = false;
  btn.innerText = "Teach Me";
}

async function submitFeedback(event) {
  const btn = event.target;
  const errorEl = document.getElementById("feedbackError");

  btn.disabled = true;
  errorEl.innerText = "";

  try {
    await feedbackAPI(document.getElementById("feedbackText").value);
    alert("Feedback Sent ✅");
    document.getElementById("feedbackText").value = "";
  } catch (err) {
    console.error(err);
    errorEl.innerText = "Failed to send feedback. Please try again.";
  }

  btn.disabled = false;
}
