-- Lately Phase 1 schema
-- Supabase SQL Editor で実行する。方針変更3（6セクション + Auth + RLS）反映済み。

create extension if not exists "pgcrypto";

-- =========================================
-- profiles
-- =========================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
);

alter table profiles enable row level security;

drop policy if exists "profiles_public_read" on profiles;
create policy "profiles_public_read" on profiles
  for select using (true);

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- 新規ユーザー作成時に空の display_name を作る（後からダッシュボードで直す）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================
-- created_by 強制
-- =========================================
create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

-- =========================================
-- Things
-- =========================================
create table if not exists things (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  product_url text,
  original_image_url text,
  processed_image_url text,
  memo text,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =========================================
-- Posts（旧 diary_entries）
-- =========================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  entry_date date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

-- =========================================
-- Places / Books / Sounds / Works
-- =========================================
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  visited_date date not null default current_date,
  image_url text,
  memo text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  status text not null default 'finished' check (status in ('reading', 'finished')),
  image_url text,
  memo text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  image_url text,
  url text,
  memo text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_label text,
  summary text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =========================================
-- RLS
-- =========================================
do $$
declare
  t text;
begin
  foreach t in array array['things','posts','post_photos','places','books','sounds','works']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- post_photos は親 posts が公開なので select 全公開
drop policy if exists "things_public_read" on things;
drop policy if exists "posts_public_read" on posts;
drop policy if exists "post_photos_public_read" on post_photos;
drop policy if exists "places_public_read" on places;
drop policy if exists "books_public_read" on books;
drop policy if exists "sounds_public_read" on sounds;
drop policy if exists "works_public_read" on works;

create policy "things_public_read" on things for select using (true);
create policy "posts_public_read" on posts for select using (true);
create policy "post_photos_public_read" on post_photos for select using (true);
create policy "places_public_read" on places for select using (true);
create policy "books_public_read" on books for select using (true);
create policy "sounds_public_read" on sounds for select using (true);
create policy "works_public_read" on works for select using (true);

drop policy if exists "things_insert_own" on things;
drop policy if exists "posts_insert_own" on posts;
drop policy if exists "places_insert_own" on places;
drop policy if exists "books_insert_own" on books;
drop policy if exists "sounds_insert_own" on sounds;
drop policy if exists "works_insert_own" on works;
drop policy if exists "post_photos_insert_auth" on post_photos;

create policy "things_insert_own" on things for insert to authenticated with check (created_by = auth.uid());
create policy "posts_insert_own" on posts for insert to authenticated with check (created_by = auth.uid());
create policy "places_insert_own" on places for insert to authenticated with check (created_by = auth.uid());
create policy "books_insert_own" on books for insert to authenticated with check (created_by = auth.uid());
create policy "sounds_insert_own" on sounds for insert to authenticated with check (created_by = auth.uid());
create policy "works_insert_own" on works for insert to authenticated with check (created_by = auth.uid());
create policy "post_photos_insert_auth" on post_photos for insert to authenticated with check (
  exists (select 1 from posts p where p.id = post_id and p.created_by = auth.uid())
);

drop policy if exists "things_update_own" on things;
drop policy if exists "posts_update_own" on posts;
drop policy if exists "places_update_own" on places;
drop policy if exists "books_update_own" on books;
drop policy if exists "sounds_update_own" on sounds;
drop policy if exists "works_update_own" on works;

create policy "things_update_own" on things for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "posts_update_own" on posts for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "places_update_own" on places for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "books_update_own" on books for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "sounds_update_own" on sounds for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "works_update_own" on works for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "things_delete_own" on things;
drop policy if exists "posts_delete_own" on posts;
drop policy if exists "places_delete_own" on places;
drop policy if exists "books_delete_own" on books;
drop policy if exists "sounds_delete_own" on sounds;
drop policy if exists "works_delete_own" on works;
drop policy if exists "post_photos_delete_own" on post_photos;

create policy "things_delete_own" on things for delete to authenticated using (created_by = auth.uid());
create policy "posts_delete_own" on posts for delete to authenticated using (created_by = auth.uid());
create policy "places_delete_own" on places for delete to authenticated using (created_by = auth.uid());
create policy "books_delete_own" on books for delete to authenticated using (created_by = auth.uid());
create policy "sounds_delete_own" on sounds for delete to authenticated using (created_by = auth.uid());
create policy "works_delete_own" on works for delete to authenticated using (created_by = auth.uid());
create policy "post_photos_delete_own" on post_photos for delete to authenticated using (
  exists (select 1 from posts p where p.id = post_id and p.created_by = auth.uid())
);

drop trigger if exists things_set_created_by on things;
drop trigger if exists posts_set_created_by on posts;
drop trigger if exists places_set_created_by on places;
drop trigger if exists books_set_created_by on books;
drop trigger if exists sounds_set_created_by on sounds;
drop trigger if exists works_set_created_by on works;

create trigger things_set_created_by before insert on things for each row execute function public.set_created_by();
create trigger posts_set_created_by before insert on posts for each row execute function public.set_created_by();
create trigger places_set_created_by before insert on places for each row execute function public.set_created_by();
create trigger books_set_created_by before insert on books for each row execute function public.set_created_by();
create trigger sounds_set_created_by before insert on sounds for each row execute function public.set_created_by();
create trigger works_set_created_by before insert on works for each row execute function public.set_created_by();

-- =========================================
-- Storage
-- =========================================
insert into storage.buckets (id, name, public)
values
  ('things-images', 'things-images', true),
  ('places-images', 'places-images', true),
  ('books-images', 'books-images', true),
  ('sounds-images', 'sounds-images', true),
  ('posts-images', 'posts-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_lately_images" on storage.objects;
create policy "public_read_lately_images" on storage.objects
  for select using (
    bucket_id in ('things-images','places-images','books-images','sounds-images','posts-images')
  );

drop policy if exists "auth_upload_lately_images" on storage.objects;
create policy "auth_upload_lately_images" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('things-images','places-images','books-images','sounds-images','posts-images')
  );

drop policy if exists "auth_delete_own_lately_images" on storage.objects;
create policy "auth_delete_own_lately_images" on storage.objects
  for delete to authenticated using (
    bucket_id in ('things-images','places-images','books-images','sounds-images','posts-images')
    and owner = auth.uid()
  );
