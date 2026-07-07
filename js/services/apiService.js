// ── Retry helper — exponential backoff for rate limits ──────────────────────
async function fetchWithRetry(url, options, maxRetries = 2) {
  let lastError;
  const delays = [2000, 4000]; // 2s, 4s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res  = await fetch(url, options);
      const data = await res.json();

      // If rate limited / service unavailable — retry
      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        const wait = delays[attempt] || 4000;
        console.warn(`[api] ${res.status} on attempt ${attempt+1} — retrying in ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      return { res, data };
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delays[attempt] || 2000));
      }
    }
  }
  throw lastError || new Error("Request failed after retries");
}

window.askDoubtAPI = async function (
  question,
  subject,
  topic
) {

  const response = await fetch(
    `${BACKEND_URL}/ask`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question,
        subject,
        topic
      })
    }
  );

  return await response.json();
};



window.tutorAPI = async function (topic) {

  const response = await fetch(
    `${BACKEND_URL}/tutor`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        topic
      })
    }
  );

  return await response.json();
};



window.feedbackAPI = async function (feedback) {

  const response = await fetch(
    `${BACKEND_URL}/feedback`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        feedback
      })
    }
  );

  return await response.json();
};
