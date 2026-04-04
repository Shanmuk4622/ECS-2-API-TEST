# CSI Live Website + Supabase + Python Uploader

This starter gives you:
- Python script to watch a folder of PNG images, upload to Supabase Storage, call your 2 APIs, and store results.
- Website that always shows the latest image and latest prediction values in near real-time.
- Prediction data stays in Postgres table (so you keep data even when images are deleted).

## 1) Create Supabase Bucket

1. Open your Supabase project dashboard.
2. Go to **Storage** -> **New bucket**.
3. Bucket name: `csi-images`.
4. Set as **Public bucket** (so website can fetch images by URL).

## 2) Create Table + Policies

1. In Supabase dashboard, open **SQL Editor**.
2. Run the SQL from [supabase_setup.sql](supabase_setup.sql).

## 3) Storage Policies (for upload/delete with anon key)

In SQL Editor run:

```sql
drop policy if exists "storage_read_anon" on storage.objects;
drop policy if exists "storage_insert_anon" on storage.objects;
drop policy if exists "storage_delete_anon" on storage.objects;

create policy "storage_read_anon"
on storage.objects
for select
to anon
using (bucket_id = 'csi-images');

create policy "storage_insert_anon"
on storage.objects
for insert
to anon
with check (bucket_id = 'csi-images');

create policy "storage_delete_anon"
on storage.objects
for delete
to anon
using (bucket_id = 'csi-images');
```

If policies already exist, remove and recreate.

If Supabase still reports "policy already exists", it means that exact policy name was already created earlier. Run the `drop policy if exists` lines first, then run the `create policy` lines again.

## 4) Configure Python Uploader

1. Create `.env` by copying `.env.example`.
2. Put your actual values:
   - `SUPABASE_URL=https://lrsszqdymumjznzmiqjq.supabase.co`
   - `SUPABASE_ANON_KEY=...`
   - API URLs already provided in `.env.example`
3. Place incoming PNG images in `incoming_images` folder.

Install and run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python .\import.py
```

What `import.py` does each loop:
- finds new PNGs
- uploads image to `csi-images/csi/...`
- calls both model APIs with that PNG
- writes API outputs into `csi_predictions`

If you are using the old serial CSI collector workflow, `import.py` is now the sender script to run on that machine. It reads from the COM ports, creates the PNG, uploads it immediately, and stores the prediction results.

## 5) Configure and Run Website

1. Copy `web/config.example.js` -> `web/config.js`.
2. Set the same `SUPABASE_URL`, `SUPABASE_ANON_KEY`, bucket/table names.
3. Serve `web` folder with a local static server.

Example with Python:

```powershell
cd .\web
python -m http.server 5500
```

Open `http://localhost:5500`.

The page polls every 2 seconds and always shows the latest row from `csi_predictions`.

## Notes

- You shared an anon key in chat. Rotate it in Supabase after testing if this key was public.
- CSI image size `400x32` is fine; APIs are called with `image/png`.
- If your API requires a different form field than `file`, update `call_model_api()` in [python/uploader.py](python/uploader.py).
- If you want a single URL like the ML model link, the Python watcher cannot be a plain local script link. It must be hosted as a service first. For now, use [import.py](import.py) on the other device and run it locally.
