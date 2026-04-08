window.CSI_API = (() => {
  const BASE_URL = "https://pasty-preaestival-romona.ngrok-free.dev";
  const HISTORY_KEY = "csi_live_history_v1";
  const MAX_HISTORY_ROWS = 600;

  function toNumber(value) {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  function normalizePrediction(payload) {
    if (!payload || typeof payload !== "object") {
      return {
        label: "-",
        confidence: null,
        timestamp: null,
        message: "No valid data"
      };
    }

    return {
      label: payload.label ?? "-",
      confidence: toNumber(payload.confidence),
      timestamp: payload.timestamp ?? null,
      message: payload.message ?? ""
    };
  }

  function normalizeTimestamp(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return value > 1e12 ? value : value * 1000;
    }

    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      return asNumber > 1e12 ? asNumber : asNumber * 1000;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function formatTime(value) {
    const ts = normalizeTimestamp(value);
    if (ts === null) {
      return "-";
    }
    return new Date(ts).toLocaleString();
  }

  async function fetchLatest(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return res.json();
  }

  async function fetchBothLatest() {
    const [presenceRaw, activityRaw] = await Promise.all([
      fetchLatest("/latest/presence"),
      fetchLatest("/latest/activity")
    ]);

    return {
      presence: normalizePrediction(presenceRaw),
      activity: normalizePrediction(activityRaw),
      raw: {
        presence: presenceRaw,
        activity: activityRaw
      },
      fetchedAt: Date.now()
    };
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(rows) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, MAX_HISTORY_ROWS)));
  }

  function snapshotSignature(snapshot) {
    const p = snapshot?.presence || {};
    const a = snapshot?.activity || {};
    return [
      p.label ?? "",
      p.confidence ?? "",
      p.timestamp ?? "",
      a.label ?? "",
      a.confidence ?? "",
      a.timestamp ?? ""
    ].join("|");
  }

  function appendHistory(snapshot) {
    const current = loadHistory();
    const incomingSig = snapshotSignature(snapshot);
    const latestSig = current[0] ? snapshotSignature(current[0]) : null;

    if (incomingSig === latestSig) {
      return current;
    }

    const next = [snapshot, ...current].slice(0, MAX_HISTORY_ROWS);
    saveHistory(next);
    return next;
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
  }

  return {
    BASE_URL,
    fetchBothLatest,
    formatTime,
    normalizeTimestamp,
    loadHistory,
    saveHistory,
    appendHistory,
    clearHistory
  };
})();
