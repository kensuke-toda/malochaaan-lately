-- コルクボード用の pins。アプリと同じプロジェクトの SQL Editor で実行する。
-- 途中で失敗した場合も再実行してよい。

create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  memo text,
  x double precision not null default 0.5,
  y double precision not null default 0.5,
  scale double precision not null default 1,
  rotation double precision not null default 0,
  z_index integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.pins enable row level security;

drop policy if exists "pins_public_read" on public.pins;
create policy "pins_public_read" on public.pins for select using (true);

drop policy if exists "pins_insert_own" on public.pins;
create policy "pins_insert_own" on public.pins for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "pins_update_own" on public.pins;
create policy "pins_update_own" on public.pins for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "pins_delete_own" on public.pins;
create policy "pins_delete_own" on public.pins for delete to authenticated using (created_by = auth.uid());

drop trigger if exists pins_set_created_by on public.pins;
create trigger pins_set_created_by before insert on public.pins for each row execute function public.set_created_by();

insert into storage.buckets (id, name, public)
values ('pins-images', 'pins-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_pins_images" on storage.objects;
create policy "public_read_pins_images" on storage.objects
  for select using (bucket_id = 'pins-images');

drop policy if exists "auth_upload_pins_images" on storage.objects;
create policy "auth_upload_pins_images" on storage.objects
  for insert to authenticated with check (bucket_id = 'pins-images');

drop policy if exists "auth_delete_own_pins_images" on storage.objects;
create policy "auth_delete_own_pins_images" on storage.objects
  for delete to authenticated using (bucket_id = 'pins-images' and owner = auth.uid());
