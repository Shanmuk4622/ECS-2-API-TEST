const api = window.CSI_API;
if (!api) {
  throw new Error("Missing live-api.js");
}

const activityEl = document.getElementById("activityResult");
const presenceEl = document.getElementById("presenceResult");
const activityLabelEl = document.getElementById("activityLabel");
const activityConfidenceEl = document.getElementById("activityConfidence");
const presenceLabelEl = document.getElementById("presenceLabel");
const presenceConfidenceEl = document.getElementById("presenceConfidence");
const activityMeterFillEl = document.getElementById("activityMeterFill");
const presenceMeterFillEl = document.getElementById("presenceMeterFill");
const activityTimeEl = document.getElementById("activityTime");
const presenceTimeEl = document.getElementById("presenceTime");
const statusEl = document.getElementById("status");
const refreshNowBtn = document.getElementById("refreshNowBtn");

const historyToggleBtn = document.getElementById("historyToggleBtn");
const historyPanelEl = document.getElementById("historyPanel");
const historyListEl = document.getElementById("historyList");
const historyLimitEl = document.getElementById("historyLimit");
const historySortEl = document.getElementById("historySort");

let historyVisible = false;
let pollHandle = null;
let pendingAnimationFrame = null;
let isFetching = false;

function setStatus(text, isError = false) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#ff8f8f" : "#abf5d3";
}

function renderMeter(meterEl, confidence) {
  if (!meterEl) {
    return;
  }
  const num = Number(confidence);
  if (Number.isNaN(num)) {
    meterEl.style.width = "0%";
    return;
  }
  meterEl.style.width = `${(Math.max(0, Math.min(1, num)) * 100).toFixed(1)}%`;
}

function renderPredictionCard({ labelEl, confEl, timeEl, jsonEl, meterEl, payload }) {
  labelEl.textContent = payload.label ?? "-";
  confEl.textContent = payload.confidence === null ? "-" : Number(payload.confidence).toFixed(4);
  timeEl.textContent = api.formatTime(payload.timestamp);
  jsonEl.textContent = JSON.stringify(payload, null, 2);
  renderMeter(meterEl, payload.confidence);
}

function animateUpdate() {
  activityEl.classList.remove("flash-in");
  presenceEl.classList.remove("flash-in");

  if (pendingAnimationFrame !== null) {
    cancelAnimationFrame(pendingAnimationFrame);
  }

  pendingAnimationFrame = requestAnimationFrame(() => {
    activityEl.classList.add("flash-in");
    presenceEl.classList.add("flash-in");
    pendingAnimationFrame = null;
  });
}

function renderHistory(rows) {
  if (!historyListEl) {
    return;
  }

  if (!rows.length) {
    historyListEl.innerHTML = '<p class="muted">No local history yet. Keep dashboard open for a few polls.</p>';
    return;
  }

  historyListEl.innerHTML = rows
    .map((row) => {
      const activity = row.activity || {};
      const presence = row.presence || {};
      return `
        <article class="history-card">
          <p><strong>Captured:</strong> ${api.formatTime(row.capturedAt)}</p>
          <p><strong>Activity:</strong> ${activity.label ?? "-"} (${activity.confidence ?? "-"})</p>
          <p><strong>Presence:</strong> ${presence.label ?? "-"} (${presence.confidence ?? "-"})</p>
          <p><strong>Source:</strong> ${api.BASE_URL}</p>
        </article>
      `;
    })
    .join("");
}

function refreshHistoryPanel() {
  if (!historyVisible) {
    return;
  }

  const limit = Number(historyLimitEl?.value || 10);
  const sort = historySortEl?.value || "desc";
  const rows = api.loadHistory().slice();

  rows.sort((a, b) => {
    const aTs = api.normalizeTimestamp(a.capturedAt) || 0;
    const bTs = api.normalizeTimestamp(b.capturedAt) || 0;
    return sort === "asc" ? aTs - bTs : bTs - aTs;
  });

  renderHistory(rows.slice(0, limit));
}

async function refreshLatest() {
  if (isFetching) {
    return;
  }
  isFetching = true;

  try {
    const result = await api.fetchBothLatest();

    renderPredictionCard({
      labelEl: activityLabelEl,
      confEl: activityConfidenceEl,
      timeEl: activityTimeEl,
      jsonEl: activityEl,
      meterEl: activityMeterFillEl,
      payload: result.activity
    });

    renderPredictionCard({
      labelEl: presenceLabelEl,
      confEl: presenceConfidenceEl,
      timeEl: presenceTimeEl,
      jsonEl: presenceEl,
      meterEl: presenceMeterFillEl,
      payload: result.presence
    });

    const snapshot = {
      capturedAt: result.fetchedAt,
      activity: result.activity,
      presence: result.presence
    };
    api.appendHistory(snapshot);

    animateUpdate();
    setStatus(`Live from ${api.BASE_URL} at ${new Date().toLocaleTimeString()}`);

    if (historyVisible) {
      refreshHistoryPanel();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(`Endpoint offline or unreachable: ${message}`, true);
  } finally {
    isFetching = false;
  }
}

refreshNowBtn?.addEventListener("click", refreshLatest);

historyToggleBtn?.addEventListener("click", () => {
  historyVisible = !historyVisible;
  historyPanelEl?.classList.toggle("hidden", !historyVisible);
  historyToggleBtn.setAttribute("aria-expanded", String(historyVisible));
  historyToggleBtn.textContent = historyVisible ? "Hide History" : "Quick History";

  if (historyVisible) {
    refreshHistoryPanel();
  }
});

historyLimitEl?.addEventListener("change", refreshHistoryPanel);
historySortEl?.addEventListener("change", refreshHistoryPanel);

setStatus("Connecting to live endpoint...");
refreshLatest();
pollHandle = setInterval(refreshLatest, 1000);
