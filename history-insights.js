const api = window.CSI_API;
if (!api) {
  throw new Error("Missing live-api.js");
}

const lookbackLimitEl = document.getElementById("lookbackLimit");
const analyzeBtnEl = document.getElementById("analyzeBtn");
const pollNowBtnEl = document.getElementById("pollNowBtn");
const statusEl = document.getElementById("status");

const kpiRowsEl = document.getElementById("kpiRows");
const kpiActivityEl = document.getElementById("kpiActivity");
const kpiPresenceEl = document.getElementById("kpiPresence");
const kpiRecentEl = document.getElementById("kpiRecent");

const activityBarsEl = document.getElementById("activityBars");
const presenceBarsEl = document.getElementById("presenceBars");

function toNum(value) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function avgConfidence(rows, key) {
  let sum = 0;
  let count = 0;

  for (const row of rows) {
    const conf = toNum(row?.[key]?.confidence);
    if (conf !== null) {
      sum += conf;
      count += 1;
    }
  }

  return count ? sum / count : null;
}

function countLabels(rows, key) {
  const map = new Map();

  for (const row of rows) {
    const label = String(row?.[key]?.label ?? "unknown").toLowerCase();
    map.set(label, (map.get(label) || 0) + 1);
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

function renderBars(rootEl, rows) {
  if (!rows.length) {
    rootEl.innerHTML = '<p class="muted">No labels available yet.</p>';
    return;
  }

  const maxValue = rows[0][1] || 1;

  rootEl.innerHTML = rows
    .map(([label, count]) => {
      const pct = (count / maxValue) * 100;
      return `
        <div class="bar-row">
          <span>${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

function analyze() {
  const limit = Number(lookbackLimitEl.value || 100);
  const rows = api.loadHistory().slice(0, limit);

  const activityAvg = avgConfidence(rows, "activity");
  const presenceAvg = avgConfidence(rows, "presence");

  kpiRowsEl.textContent = String(rows.length);
  kpiActivityEl.textContent = activityAvg === null ? "-" : activityAvg.toFixed(4);
  kpiPresenceEl.textContent = presenceAvg === null ? "-" : presenceAvg.toFixed(4);
  kpiRecentEl.textContent = rows[0] ? api.formatTime(rows[0].capturedAt) : "-";

  renderBars(activityBarsEl, countLabels(rows, "activity"));
  renderBars(presenceBarsEl, countLabels(rows, "presence"));

  statusEl.textContent = `Analyzed ${rows.length} local rows`;
}

async function pollNow() {
  statusEl.textContent = "Polling endpoint now...";

  try {
    const latest = await api.fetchBothLatest();
    api.appendHistory({
      capturedAt: latest.fetchedAt,
      activity: latest.activity,
      presence: latest.presence
    });

    analyze();
    statusEl.textContent = `Polled and analyzed at ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    statusEl.textContent = `Poll failed: ${message}`;
  }
}

analyzeBtnEl.addEventListener("click", analyze);
pollNowBtnEl.addEventListener("click", pollNow);
lookbackLimitEl.addEventListener("change", analyze);

analyze();
