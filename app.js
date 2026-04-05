const cfg = window.APP_CONFIG;
if (!cfg) {
  throw new Error("Missing config.js. Copy config.example.js to config.js first.");
}

const supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const latestImageEl = document.getElementById("latestImage");
const imageMetaEl = document.getElementById("imageMeta");
const activityEl = document.getElementById("activityResult");
const presenceEl = document.getElementById("presenceResult");
const statusEl = document.getElementById("status");

let lastId = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#12715f";
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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

  activityEl.textContent = prettyJson(row.activity_result);
  presenceEl.textContent = prettyJson(row.presence_result);

  lastId = row.id;
  setStatus(`Updated at ${new Date().toLocaleTimeString()}`);
}

setStatus("Connected");
refreshLatest();
setInterval(refreshLatest, cfg.POLL_MS);