/**
 * MaitriLearn Analytics
 * - Tracks page visits in Supabase
 * - Works alongside Google Analytics
 * - Lightweight, no external dependencies
 */

window.MaitriAnalytics = (function () {

  // ── CONFIG ────────────────────────────────────────────────────────────────
  // These are set from config.js — no change needed here
  const SUPA_URL = typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : null;
  const SUPA_KEY = typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY : null;

  // ── DEVICE DETECTION ──────────────────────────────────────────────────────
  function getDevice() {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua))  return "mobile";
    if (/tablet/i.test(ua))  return "tablet";
    return "desktop";
  }

  // ── PAGE NAME ─────────────────────────────────────────────────────────────
  function getPageName() {
    const path = window.location.pathname;
    const map  = {
      "/":                    "home",
      "/index.html":          "home",
      "/whiteboard.html":     "whiteboard",
      "/devops.html":         "devops",
      "/terminal.html":       "terminal",
      "/admin.html":          "admin",
    };
    // Match by filename
    const file = path.split("/").pop() || "index.html";
    return map["/" + file] || map[path] || file.replace(".html", "") || "home";
  }

  // ── TRACK VISIT ───────────────────────────────────────────────────────────
  async function track(extraData = {}) {
    if (!SUPA_URL || !SUPA_KEY) return;

    const payload = {
      page:     getPageName(),
      referrer: document.referrer || null,
      device:   getDevice(),
      topic:    extraData.topic || null,
    };

    try {
      await fetch(`${SUPA_URL}/rest/v1/page_visits`, {
        method:  "POST",
        headers: {
          "apikey":        SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Content-Type":  "application/json",
          "Prefer":        "return=minimal"
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Silent fail — never block user experience
    }
  }

  // ── TRACK TOPIC SEARCH ────────────────────────────────────────────────────
  function trackTopic(topic) {
    track({ topic });
    // Also send to Google Analytics if available
    if (typeof gtag === "function") {
      gtag("event", "topic_search", {
        event_category: "whiteboard",
        event_label:    topic
      });
    }
  }

  // ── TRACK PAGE VIEW ───────────────────────────────────────────────────────
  function trackPageView() {
    track();
  }

  // Auto-track on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageView);
  } else {
    trackPageView();
  }

  return { trackTopic, trackPageView };

})();
