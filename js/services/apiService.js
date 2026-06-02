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
