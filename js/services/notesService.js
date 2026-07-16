const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.uploadNoteService = async function (file, metadata) {
  const fileName = `${Date.now()}_${file.name}`;

  // Step 1: Upload file to Supabase Storage
  const { error: uploadError } = await supabaseClient
    .storage.from("notes").upload(fileName, file);

  if (uploadError) {
    console.error("Upload failed:", uploadError);
    throw new Error("File upload failed: " + uploadError.message);
  }

  // Step 2: Get public URL
  const { data: urlData } = supabaseClient
    .storage.from("notes").getPublicUrl(fileName);

  // Step 3: Save metadata
  const { error: metaError } = await supabaseClient
    .from("notes_metadata")
    .insert([{
      student_class: metadata.student_class,
      subject:       metadata.subject,
      topic:         metadata.topic,
      url:           urlData.publicUrl
    }]);

  if (metaError) {
    console.error("Metadata insert failed:", metaError);
    throw new Error("Metadata save failed: " + metaError.message);
  }

  // Step 4: RAG ingest — wait for it so user sees feedback
  // Use BACKEND_URL from config.js
  const backendUrl = typeof BACKEND_URL !== "undefined"
    ? BACKEND_URL : "http://localhost:5000";

  let ragResult = null;
  try {
    // Uses the public, rate-limited student-notes route — NOT the admin
    // /rag/ingest route, which now requires an X-Admin-Key that must never
    // live in frontend JS. See routes/rag.py for details.
    const ragRes = await fetch(`${backendUrl}/rag/notes/ingest`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename:  fileName,
        topic:     metadata.topic || metadata.subject || "General",
        bucket:    "notes",
        max_pages: 30
      })
    });

    ragResult = await ragRes.json();

    if (ragResult.chunks_stored > 0) {
      console.log(`[rag] ✅ Ingested ${ragResult.chunks_stored} chunks for "${metadata.topic}"`);
    } else if (ragResult.error) {
      console.warn("[rag] Ingest warning:", ragResult.error);
    }
  } catch (err) {
    // RAG ingest failed — file is still uploaded, just not in knowledge base
    console.warn("[rag] Ingest failed:", err.message);
    ragResult = { error: err.message };
  }

  return {
    fileName,
    publicUrl:    urlData.publicUrl,
    ragResult,
    chunksStored: ragResult?.chunks_stored || 0
  };
};

window.searchNotesService = async function (search) {
  if (!search || !search.trim()) {
    const { data, error } = await supabaseClient
      .from("notes_metadata")
      .select("*")
      .order("id", { ascending: false })
      .limit(20);
    if (error) { console.error("Search failed:", error); return []; }
    return data || [];
  }

  const { data, error } = await supabaseClient
    .from("notes_metadata")
    .select("*")
    .or(`topic.ilike.%${search}%,subject.ilike.%${search}%`)
    .order("id", { ascending: false });

  if (error) { console.error("Search failed:", error); return []; }
  return data || [];
};
