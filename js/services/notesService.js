const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.uploadNoteService = async function (file, metadata) {
  const fileName = `${Date.now()}_${file.name}`;

  // Upload file to storage
  const { error: uploadError } = await supabaseClient
    .storage
    .from("notes")
    .upload(fileName, file);

  if (uploadError) {
    console.error("Upload failed:", uploadError);
    throw new Error("File upload failed: " + uploadError.message);
  }

  // Get public URL
  const { data } = supabaseClient
    .storage
    .from("notes")
    .getPublicUrl(fileName);

  // Save metadata to notes_metadata table
  const { error: metaError } = await supabaseClient
    .from("notes_metadata")
    .insert([{
      student_class: metadata.student_class,
      subject:       metadata.subject,
      topic:         metadata.topic,
      url:           data.publicUrl
    }]);

  if (metaError) {
    console.error("Metadata insert failed:", metaError);
    throw new Error("Metadata save failed: " + metaError.message);
  }

  // BUG FIX: RAG ingest runs in background — don't block upload success
  // Large PDFs take 30-60s to ingest — user shouldn't wait
  fetch(`${BACKEND_URL}/rag/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename:  fileName,
      topic:     metadata.topic || "General",
      bucket:    "notes",
      max_pages: 20
    })
  })
  .then(r => r.json())
  .then(result => {
    if (result.chunks_stored > 0) {
      console.log(`[rag] Ingested ${result.chunks_stored} chunks for ${metadata.topic}`);
    }
  })
  .catch(err => console.warn("[rag] Background ingest:", err.message));

  // Return immediately — don't wait for RAG
  return { fileName, publicUrl: data.publicUrl };
};

window.searchNotesService = async function (search) {
  // BUG FIX: search was failing silently when notes_metadata table was empty
  // or when topic column had no match — now returns [] properly
  if (!search || !search.trim()) {
    // Return all notes if search is empty
    const { data, error } = await supabaseClient
      .from("notes_metadata")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Search failed:", error);
      return [];
    }
    return data || [];
  }

  const { data, error } = await supabaseClient
    .from("notes_metadata")
    .select("*")
    .or(`topic.ilike.%${search}%,subject.ilike.%${search}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Search failed:", error);
    return [];
  }

  return data || [];
};
