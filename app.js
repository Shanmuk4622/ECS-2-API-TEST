const cfg = window.APP_CONFIG;
if (!cfg) {
  throw new Error("Missing config.js. Copy config.example.js to config.js first.");
}

const supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const latestImageEl = document.getElementById("latestImage");
const imageMetaEl = document.getElementById("imageMeta");
const activityEl = document.getElementById("activityResult");
const presenceEl = document.getElementById("presenceResult");
const activityLabelEl = document.getElementById("activityLabel");
const activityConfidenceEl = document.getElementById("activityConfidence");
const presenceLabelEl = document.getElementById("presenceLabel");
const presenceConfidenceEl = document.getElementById("presenceConfidence");
const statusEl = document.getElementById("status");
const historyToggleBtn = document.getElementById("historyToggleBtn");
const historyPanelEl = document.getElementById("historyPanel");
const historyListEl = document.getElementById("historyList");
const historyLimitEl = document.getElementById("historyLimit");
const historySortEl = document.getElementById("historySort");

let lastId = null;
let historyVisible = false;
let pollHandle = null;
let pendingAnimationFrame = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#12715f";
}

function asRawJson(value) {
  try {
    if (typeof value === "string") {
      return value;
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function pickField(obj, key) {
  if (!obj || typeof obj !== "object") {
    return "-";
  }
  const value = obj[key];
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
}

function animateUpdate() {
  latestImageEl.classList.remove("image-pop");
  activityEl.classList.remove("flash-in");
  presenceEl.classList.remove("flash-in");

  if (pendingAnimationFrame !== null) {
    cancelAnimationFrame(pendingAnimationFrame);
  }

  pendingAnimationFrame = requestAnimationFrame(() => {
    latestImageEl.classList.add("image-pop");
    activityEl.classList.add("flash-in");
    presenceEl.classList.add("flash-in");
    pendingAnimationFrame = null;
  });
}

function renderHistory(rows) {
  if (!rows || rows.length === 0) {
    historyListEl.innerHTML = '<p class="muted">No rows found for the selected options.</p>';
    return;
  }

  const cards = rows.map((row) => {
    const createdAt = new Date(row.created_at).toLocaleString();
    const activityLabel = pickField(row.activity_result, "label");
    const activityConfidence = pickField(row.activity_result, "confidence");
    const presenceLabel = pickField(row.presence_result, "label");
    const presenceConfidence = pickField(row.presence_result, "confidence");

    return `
      <article class="history-card">
        <p><strong>ID:</strong> ${row.id}</p>
        <p><strong>Created:</strong> ${createdAt}</p>
        <p><strong>Image:</strong> ${row.image_path}</p>
        <p><strong>Activity:</strong> ${activityLabel} (${activityConfidence})</p>
        <p><strong>Presence:</strong> ${presenceLabel} (${presenceConfidence})</p>
      </article>
    `;
  });

  historyListEl.innerHTML = cards.join("");
}

async function refreshHistory() {
  if (!historyVisible) {
    return;
  }

  const limit = Number(historyLimitEl.value || 10);
  const ascending = historySortEl.value === "asc";
  const { data, error } = await supabaseClient
    .from(cfg.TABLE_NAME)
    .select("id, image_path, activity_result, presence_result, created_at")
    .order("created_at", { ascending })
    .limit(limit);

  if (error) {
    historyListEl.innerHTML = `<p class="muted">Failed to load history: ${error.message}</p>`;
    return;
  }

  renderHistory(data || []);
}

async function refreshLatest() {
  const { data, error } = await supabaseClient
    .from(cfg.TABLE_NAME)
    .select("id, image_path, activity_result, presence_result, created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    setStatus(`Error: ${error.message}`, true);
    return;
  }

  if (!data || data.length === 0) {
    setStatus("No data yet");
    return;
  }

  const row = data[0];
  if (row.id === lastId) {
    setStatus(`Live polling every ${cfg.POLL_MS}ms`);
    return;
  }

  const { data: imageData } = supabaseClient.storage
    .from(cfg.BUCKET_NAME)
    .getPublicUrl(row.image_path);

  latestImageEl.src = `${imageData.publicUrl}?t=${Date.now()}`;
  imageMetaEl.textContent = `Path: ${row.image_path} | Created: ${new Date(row.created_at).toLocaleString()}`;

  activityLabelEl.textContent = pickField(row.activity_result, "label");
  activityConfidenceEl.textContent = pickField(row.activity_result, "confidence");
  presenceLabelEl.textContent = pickField(row.presence_result, "label");
  presenceConfidenceEl.textContent = pickField(row.presence_result, "confidence");

  activityEl.textContent = asRawJson(row.activity_result);
  presenceEl.textContent = asRawJson(row.presence_result);

  animateUpdate();
  lastId = row.id;
  setStatus(`Updated at ${new Date().toLocaleTimeString()}`);

  if (historyVisible) {
    refreshHistory();
  }
}

setStatus("Connected");
refreshLatest();

pollHandle = setInterval(refreshLatest, cfg.POLL_MS);

historyToggleBtn?.addEventListener("click", async () => {
  historyVisible = !historyVisible;
  historyPanelEl.classList.toggle("hidden", !historyVisible);
  historyToggleBtn.setAttribute("aria-expanded", String(historyVisible));
  historyToggleBtn.textContent = historyVisible ? "Hide History" : "History";

  if (historyVisible) {
    await refreshHistory();
  }
});

historyLimitEl?.addEventListener("change", refreshHistory);
historySortEl?.addEventListener("change", refreshHistory);