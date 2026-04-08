const api = window.CSI_API;
if (!api) {
  throw new Error("Missing live-api.js");
}

const cardsEl = document.getElementById("cards");
const tableBodyEl = document.getElementById("tableBody");
const statusEl = document.getElementById("status");
const limitEl = document.getElementById("limit");
const orderEl = document.getElementById("order");
const filterTextEl = document.getElementById("filterText");
const refreshBtnEl = document.getElementById("refreshBtn");
const pollNowBtnEl = document.getElementById("pollNowBtn");
const clearHistoryBtnEl = document.getElementById("clearHistoryBtn");

function matchesFilter(row, filterText) {
  if (!filterText) {
    return true;
  }

  const text = filterText.toLowerCase();
  const activityLabel = String(row?.activity?.label ?? "").toLowerCase();
  const presenceLabel = String(row?.presence?.label ?? "").toLowerCase();

  return activityLabel.includes(text) || presenceLabel.includes(text);
}

function render(rows) {
  if (!rows.length) {
    cardsEl.innerHTML = '<p class="muted">No local history rows yet. Click Poll Now when endpoint is online.</p>';
    tableBodyEl.innerHTML = "";
    return;
  }

  cardsEl.innerHTML = rows
    .slice(0, 24)
    .map((row) => {
      return `
        <article class="history-card">
          <p><strong>Captured:</strong> <span class="chip">${api.formatTime(row.capturedAt)}</span></p>
          <p><strong>Activity:</strong> ${row.activity?.label ?? "-"} (${row.activity?.confidence ?? "-"})</p>
          <p><strong>Presence:</strong> ${row.presence?.label ?? "-"} (${row.presence?.confidence ?? "-"})</p>
        </article>
      `;
    })
    .join("");

  tableBodyEl.innerHTML = rows
    .map((row, idx) => {
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${api.formatTime(row.capturedAt)}</td>
          <td>${row.activity?.label ?? "-"}</td>
          <td>${row.activity?.confidence ?? "-"}</td>
          <td>${row.presence?.label ?? "-"}</td>
          <td>${row.presence?.confidence ?? "-"}</td>
          <td>${api.BASE_URL}</td>
        </tr>
      `;
    })
    .join("");
}

function refreshView() {
  const limit = Number(limitEl.value || 50);
  const ascending = orderEl.value === "asc";
  const filterText = filterTextEl.value.trim();

  const rows = api
    .loadHistory()
    .slice()
    .filter((row) => matchesFilter(row, filterText));

  rows.sort((a, b) => {
    const aTs = api.normalizeTimestamp(a.capturedAt) || 0;
    const bTs = api.normalizeTimestamp(b.capturedAt) || 0;
    return ascending ? aTs - bTs : bTs - aTs;
  });

  const result = rows.slice(0, limit);
  render(result);
  statusEl.textContent = `Showing ${result.length} rows from local history`;
}

async function pollNow() {
  statusEl.textContent = "Polling live endpoint...";

  try {
    const latest = await api.fetchBothLatest();
    api.appendHistory({
      capturedAt: latest.fetchedAt,
      activity: latest.activity,
      presence: latest.presence
    });

    refreshView();
    statusEl.textContent = `Polled live endpoint at ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    statusEl.textContent = `Poll failed: ${message}`;
  }
}

function clearHistory() {
  api.clearHistory();
  refreshView();
  statusEl.textContent = "Local history cleared";
}

refreshBtnEl.addEventListener("click", refreshView);
pollNowBtnEl.addEventListener("click", pollNow);
clearHistoryBtnEl.addEventListener("click", clearHistory);
limitEl.addEventListener("change", refreshView);
orderEl.addEventListener("change", refreshView);
filterTextEl.addEventListener("input", refreshView);

refreshView();
