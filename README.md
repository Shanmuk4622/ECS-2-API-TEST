# CSI Live Monitor

This project has two separate parts:

1. A sender script on the machine that reads CSI data from the serial port, creates PNG images, uploads them to Supabase, calls both model APIs, and stores the results.
2. A static website that reads the latest result from Supabase and shows the newest image plus the model outputs.

The website does not need Python. Python is only needed on the machine connected to the CSI source.

## Project Flow

1. CSI data is collected from the ESP device over serial.
2. The sender script turns one CSI block into one PNG image.
3. The PNG is uploaded to Supabase Storage.
4. The PNG is sent to the two model endpoints.
5. The returned JSON values are saved in Supabase Postgres.
6. The website fetches the latest row from Supabase and displays it.

## Files You Will Use

- [import.py](import.py) is the sender script.
- [web/index.html](web/index.html) is the website page.
- [web/app.js](web/app.js) is the website logic.
- [web/config.example.js](web/config.example.js) is the template for website config.
- [.env.example](.env.example) is the template for the sender machine config.

## 1) Create Supabase Storage Bucket

1. Open your Supabase project dashboard.
2. Go to **Storage**.
3. Create a new bucket named `csi-images`.
4. Make it a **public bucket** so the website can load images by URL.

## 2) Create the Database Table

1. Open **SQL Editor** in Supabase.
2. Run the SQL from [supabase_setup.sql](supabase_setup.sql).

This creates the `csi_predictions` table that stores:
- image path
- activity model output
- presence model output
- timestamp

## 3) Add Storage Policies

In the Supabase SQL editor, run:

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
```

You only need delete policy if you want the sender script to remove old images from storage.

If Supabase says a policy already exists, run the `drop policy if exists` lines first, then run the create lines again.

## 4) Set Up the Sender Machine

This is the computer connected to the CSI/serial source.

1. Copy [.env.example](.env.example) to `.env`.
2. Fill in your real Supabase URL and anon key.
3. Make sure the model URLs are correct.
4. Install the Python packages.

Run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python .\import.py
```

The sender script does this every time it creates a new image:
- saves the image locally
- uploads it to Supabase Storage
- sends it to the activity model
- sends it to the presence model
- saves the prediction row in Supabase

If you want a cleaner terminal, [import.py](import.py) already prints a step-by-step status for each new image.

## 5) Configure the Website

The website is static. It only needs HTML, CSS, and JavaScript.

1. Copy [web/config.example.js](web/config.example.js) to [web/config.js](web/config.js).
2. Put the same Supabase URL, anon key, bucket name, and table name in it.
3. Open [web/index.html](web/index.html) through a static host.

The website polls Supabase every 2 seconds and always shows the newest:
- image
- activity result
- presence result

## 6) How to Get the Website Online

You have three simple options.

### Option A: Netlify

This is the easiest option.

1. Go to https://www.netlify.com/.
2. Sign in.
3. Drag and drop the `web` folder contents into Netlify, or connect your GitHub repo.
4. Deploy.

Your website will get a public URL.

Important: upload the `web` folder, not the Python files.

### Option B: Vercel

1. Go to https://vercel.com/.
2. Import your GitHub repository.
3. Set the project root to the `web` folder if needed, or deploy the static files directly.
4. Deploy.

### Option C: GitHub Pages

1. Put the `web` folder in a GitHub repo.
2. Enable GitHub Pages in repository settings.
3. Set the publish source to the `web` folder or the branch that contains the website files.

This is good if you want a very simple static site.

## Local Test

If you want to test locally first:

```powershell
cd .\web
python -m http.server 5500
```

Then open:

`http://localhost:5500`

## What Runs Where

- Sender machine: `import.py`
- Supabase: bucket and table
- Website host: static files only

The website does not need to run Python.

## Notes

- You shared an anon key in chat. Rotate it in Supabase after testing if needed.
- CSI image size `400x32` is fine.
- If your model API expects a different upload field name, update `call_model_api()` in [python/uploader.py](python/uploader.py).
- If you want the sender script to run as a service later, you can host it separately, but that is not required for the website.
