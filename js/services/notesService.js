const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.uploadNoteService = async function (
  file,
  metadata
) {

  const fileName = `${Date.now()}_${file.name}`;

  // Upload file
  const { error } = await supabaseClient
    .storage
    .from("notes")
    .upload(fileName, file);

  if (error) {
    console.error("Upload failed:", error);
    return;
  }

  // Get public URL
  const { data } = supabaseClient
    .storage
    .from("notes")
    .getPublicUrl(fileName);

  // Save metadata
  const { error: metaError } = await supabaseClient
    .from("notes_metadata")
    .insert([
      {
        student_class: metadata.student_class,
        subject: metadata.subject,
        topic: metadata.topic,
        url: data.publicUrl
      }
    ]);

  if (metaError) {
    console.error("Metadata insert failed:", metaError);
    return;
  }

  // Trigger RAG ingestion
  try {

    const response = await fetch(
      `${BACKEND_URL}/rag/ingest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filename: fileName,
          topic: metadata.topic,
          bucket: "notes"
        })
      }
    );

    const result = await response.json();

    console.log("RAG Result:", result);

    if (!response.ok) {
      throw new Error(
        result.error || "RAG ingestion failed"
      );
    }

    alert(
      `Upload successful!\nChunks Stored: ${result.chunks_stored}/${result.total_chunks}`
    );

  } catch (err) {

    console.error(
      "RAG ingest failed:",
      err
    );

    alert(
      "File uploaded but RAG ingestion failed.\nCheck Render logs."
    );
  }
};
