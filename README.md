# CSI Live Monitor

Realtime CSI dashboard that now reads directly from live model endpoints (no Supabase needed for the website).

## Website Preview

![CSI Live Monitor UI](web/image.png)

## Live Data Source

The frontend polls these endpoints every second:

- `https://pasty-preaestival-romona.ngrok-free.dev/latest/activity`
- `https://pasty-preaestival-romona.ngrok-free.dev/latest/presence`

## How The Website Works (Current)

1. `index.html` polls both live endpoints.
2. It renders real values only:
  - label
  - confidence
  - timestamp
  - raw JSON payload
3. Every successful poll is saved in browser local storage as a snapshot.
4. `history.html` displays that local snapshot history with filter/sort/limit controls.
5. `history-insights.html` computes local analytics (averages and label distribution) from those snapshots.

Important: history and insights are based on real endpoint polls captured by the browser session, not on a database table.

## Project Files

- [index.html](index.html): Main live dashboard
- [app.js](app.js): Dashboard polling and quick history logic
- [live-api.js](live-api.js): Shared API client + local history storage
- [history.html](history.html): Full history page from local snapshots
- [history.js](history.js): History filtering, sorting, polling, clear actions
- [history-insights.html](history-insights.html): Aggregated metrics page
- [history-insights.js](history-insights.js): Insights computation from local snapshots
- [styles.css](styles.css): Shared styling and animations
- [import.py](import.py): Sender script (kept for CSI capture pipeline)
- [python/uploader.py](python/uploader.py): Helper functions used by sender pipeline

## Website Setup

No frontend config file is required for the current live dashboard path.

1. Ensure the model host laptop is online and ngrok tunnel is running.
2. Ensure both endpoints return JSON:
  - `/latest/activity`
  - `/latest/presence`
3. Serve this folder as static files.

## Local Website Test

From repository root:

```powershell
python -m http.server 5500
```

Open:

- `http://localhost:5500/index.html` (dashboard)
- `http://localhost:5500/history.html` (history)
- `http://localhost:5500/history-insights.html` (insights)

## Deploy Website Online

Because `index.html` is in repository root, deploy from root.

### GitHub Pages

1. Repository Settings -> Pages
2. Source: `Deploy from a branch`
3. Branch: `main`
4. Folder: `/ (root)`

### Netlify

1. Import repo in Netlify
2. Build command: none
3. Publish directory: `.`

### Vercel

1. Import repo in Vercel
2. Framework preset: `Other`
3. Output directory: `.`

## Endpoint Health Check

Use PowerShell to verify endpoint availability:

```powershell
Invoke-RestMethod -Headers @{"ngrok-skip-browser-warning"="true"} -Uri "https://pasty-preaestival-romona.ngrok-free.dev/latest/activity" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Headers @{"ngrok-skip-browser-warning"="true"} -Uri "https://pasty-preaestival-romona.ngrok-free.dev/latest/presence" | ConvertTo-Json -Depth 6
```

If ngrok returns `ERR_NGROK_3200`, the tunnel is offline.

## Troubleshooting

- Dashboard shows endpoint offline:
  The ngrok URL is not reachable. Restart tunnel on the model host laptop.
- No history visible:
  History appears only after at least one successful poll from the dashboard or History page Poll Now action.
- Insights are empty:
  Insights read from local snapshot history. Poll first, then analyze.
- Python import errors for sender scripts:
  Install dependencies from [requirements.txt](requirements.txt).

## Sender Pipeline (Optional / Separate)

The Python sender pipeline and Supabase-related files are still in the repository for ingestion workflows, but the current website UI does not depend on Supabase.
