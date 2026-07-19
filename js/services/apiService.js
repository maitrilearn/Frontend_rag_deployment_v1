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

// BUG FIX (QA audit follow-up): fetchWithRetry was defined above but never
// actually called anywhere — askDoubtAPI/tutorAPI/feedbackAPI were all using
// plain fetch(), so the exact endpoints most likely to 503 under concurrent
// load (/ask, /tutor) had zero retry protection on the main index.html path.
// whiteboard.html has its own separate inline retry logic and was fine;
// this file was the gap. All three now route through fetchWithRetry.
window.askDoubtAPI = async function (
  question,
  subject,
  topic
) {
  const { data } = await fetchWithRetry(
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

  return data;
};



window.tutorAPI = async function (topic) {
  const { data } = await fetchWithRetry(
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

  return data;
};



window.feedbackAPI = async function (feedback) {
  const { data } = await fetchWithRetry(
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

  return data;
};
