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

let lastId = null;

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

  lastId = row.id;
  setStatus(`Updated at ${new Date().toLocaleTimeString()}`);
}

setStatus("Connected");
refreshLatest();
setInterval(refreshLatest, cfg.POLL_MS);