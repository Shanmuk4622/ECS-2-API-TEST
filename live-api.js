window.CSI_API = (() => {
  const DEFAULT_SERVER_URLS = [
    "http://10.74.89.201:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://pasty-preaestival-romona.ngrok-free.dev"
  ];
  let customUrl = localStorage.getItem("csi_custom_url") || "";
  let SERVER_URLS = customUrl ? [customUrl, ...DEFAULT_SERVER_URLS] : [...DEFAULT_SERVER_URLS];
  let activeUrlIndex = 0;

  function setCustomUrl(url) {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }
    
    if (cleanUrl) {
      localStorage.setItem("csi_custom_url", cleanUrl);
      customUrl = cleanUrl;
      SERVER_URLS = [cleanUrl, ...DEFAULT_SERVER_URLS];
    } else {
      localStorage.removeItem("csi_custom_url");
      customUrl = "";
      SERVER_URLS = [...DEFAULT_SERVER_URLS];
    }
    activeUrlIndex = 0;
  }

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

  async function fetchBothLatest() {
    let lastError = null;
    const MAX_RETRIES = 2; // Try each server up to 3 times total

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      for (let i = 0; i < SERVER_URLS.length; i++) {
        const index = (activeUrlIndex + i) % SERVER_URLS.length;
        const baseUrl = SERVER_URLS[index];

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout per request

          const options = {
            headers: {
              "ngrok-skip-browser-warning": "true"
            },
            signal: controller.signal
          };

          const [presenceRes, activityRes] = await Promise.all([
            fetch(`${baseUrl}/latest/presence`, options),
            fetch(`${baseUrl}/latest/activity`, options)
          ]);

          clearTimeout(timeoutId);

          if (!presenceRes.ok || !activityRes.ok) {
            throw new Error(`HTTP Error: presence=${presenceRes.status}, activity=${activityRes.status} from ${baseUrl}`);
          }

          const [presenceRaw, activityRaw] = await Promise.all([
            presenceRes.json(),
            activityRes.json()
          ]);

          // Update active URL if successful so subsequent calls use it directly
          activeUrlIndex = index;

          return {
            presence: normalizePrediction(presenceRaw),
            activity: normalizePrediction(activityRaw),
            raw: {
              presence: presenceRaw,
              activity: activityRaw
            },
            fetchedAt: Date.now()
          };
        } catch (err) {
          lastError = err;
          // Loop continues to the next server URL
        }
      }

      if (attempt < MAX_RETRIES) {
        // Wait briefly before retrying all servers again
        await new Promise(r => setTimeout(r, 500));
      }
    }

    throw new Error(`All endpoints failed. Last error: ${lastError?.message}`);
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
    get BASE_URL() {
      return SERVER_URLS[activeUrlIndex];
    },
    get customUrl() {
      return customUrl;
    },
    setCustomUrl,
    fetchBothLatest,
    formatTime,
    normalizeTimestamp,
    loadHistory,
    saveHistory,
    appendHistory,
    clearHistory
  };
})();
