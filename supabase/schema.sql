-- Lately: Things（モノ図鑑）と Diary（日記）のスキーマ
-- Supabase の SQL Editor でこのファイルの内容を実行してください。

create extension if not exists "pgcrypto";

-- =========================================
-- Things（モノ図鑑）
-- =========================================
create table if not exists things (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  product_url text,
  original_image_url text,
  processed_image_url text, -- 背景透過済み画像（未処理の間は null、original を代わりに表示）
  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================
-- Diary（日記）
-- =========================================
create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists diary_photos (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

-- =========================================
-- RLS（読み取りは全公開、書き込みは Service Role のみ）
-- =========================================
alter table things enable row level security;
alter table diary_entries enable row level security;
alter table diary_photos enable row level security;

create policy "things_public_read" on things
  for select using (true);

create policy "diary_entries_public_read" on diary_entries
  for select using (true);

create policy "diary_photos_public_read" on diary_photos
  for select using (true);

-- insert / update / delete のポリシーはあえて作成しない
-- → anon / authenticated ロールからは書き込み不可、Service Role（RLSを迂回）のみ書き込み可能

-- =========================================
-- Storage バケット（公開読み取り、書き込みは Service Role のみ）
-- =========================================
insert into storage.buckets (id, name, public)
values
  ('things-images', 'things-images', true),
  ('diary-images', 'diary-images', true)
on conflict (id) do nothing;
