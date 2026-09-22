-- Podcast（Sounds相当）と Movie（Posts相当）を追加する。既存DB向け。
-- Supabase SQL Editor で実行する。新規セットアップは schema.sql を使う。
-- 途中で失敗した場合も、このファイルを再実行してよい。

create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create table if not exists podcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  image_url text,
  url text,
  memo text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists movies (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  entry_date date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists movie_photos (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references movies(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

alter table podcasts enable row level security;
alter table movies enable row level security;
alter table movie_photos enable row level security;

drop policy if exists "podcasts_public_read" on podcasts;
drop policy if exists "movies_public_read" on movies;
drop policy if exists "movie_photos_public_read" on movie_photos;
create policy "podcasts_public_read" on podcasts for select using (true);
create policy "movies_public_read" on movies for select using (true);
create policy "movie_photos_public_read" on movie_photos for select using (true);

drop policy if exists "podcasts_insert_own" on podcasts;
drop policy if exists "movies_insert_own" on movies;
drop policy if exists "movie_photos_insert_auth" on movie_photos;
create policy "podcasts_insert_own" on podcasts for insert to authenticated with check (created_by = auth.uid());
create policy "movies_insert_own" on movies for insert to authenticated with check (created_by = auth.uid());
create policy "movie_photos_insert_auth" on movie_photos for insert to authenticated with check (
  exists (select 1 from movies m where m.id = movie_id and m.created_by = auth.uid())
);

drop policy if exists "podcasts_update_own" on podcasts;
drop policy if exists "movies_update_own" on movies;
create policy "podcasts_update_own" on podcasts for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "movies_update_own" on movies for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "podcasts_delete_own" on podcasts;
drop policy if exists "movies_delete_own" on movies;
drop policy if exists "movie_photos_delete_own" on movie_photos;
create policy "podcasts_delete_own" on podcasts for delete to authenticated using (created_by = auth.uid());
create policy "movies_delete_own" on movies for delete to authenticated using (created_by = auth.uid());
create policy "movie_photos_delete_own" on movie_photos for delete to authenticated using (
  exists (select 1 from movies m where m.id = movie_id and m.created_by = auth.uid())
);

drop trigger if exists podcasts_set_created_by on podcasts;
drop trigger if exists movies_set_created_by on movies;
create trigger podcasts_set_created_by before insert on podcasts for each row execute function public.set_created_by();
create trigger movies_set_created_by before insert on movies for each row execute function public.set_created_by();

insert into storage.buckets (id, name, public)
values
  ('podcasts-images', 'podcasts-images', true),
  ('movies-images', 'movies-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_lately_images" on storage.objects;
create policy "public_read_lately_images" on storage.objects
  for select using (
    bucket_id in ('things-images','places-images','books-images','sounds-images','posts-images','podcasts-images','movies-images')
  );

drop policy if exists "auth_upload_lately_images" on storage.objects;
create policy "auth_upload_lately_images" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('things-images','places-images','books-images','sounds-images','posts-images','podcasts-images','movies-images')
  );

drop policy if exists "auth_delete_own_lately_images" on storage.objects;
create policy "auth_delete_own_lately_images" on storage.objects
  for delete to authenticated using (
    bucket_id in ('things-images','places-images','books-images','sounds-images','posts-images','podcasts-images','movies-images')
    and owner = auth.uid()
  );
