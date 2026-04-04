-- 1) Table for values you want to keep long-term.
create table if not exists public.csi_predictions (
  id bigint generated always as identity primary key,
  image_path text not null,
  activity_result jsonb,
  presence_result jsonb,
  created_at timestamptz not null default now()
);

-- 2) Enable RLS.
alter table public.csi_predictions enable row level security;

-- 3) Read policy for website (anon key).
drop policy if exists "csi_predictions_select_anon" on public.csi_predictions;
create policy "csi_predictions_select_anon"
on public.csi_predictions
for select
to anon
using (true);

-- 4) Insert policy for uploader script using anon key.
drop policy if exists "csi_predictions_insert_anon" on public.csi_predictions;
create policy "csi_predictions_insert_anon"
on public.csi_predictions
for insert
to anon
with check (true);
