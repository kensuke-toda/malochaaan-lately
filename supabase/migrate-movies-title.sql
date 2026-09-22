-- Movies を タイトル・感想・写真 に変更する。既存DB向け。
-- Supabase SQL Editor で実行する。

alter table movies add column if not exists title text;
alter table movies add column if not exists image_url text;

update movies
set title = left(btrim(body), 80)
where (title is null or btrim(title) = '')
  and body is not null
  and btrim(body) <> '';

update movies
set title = '無題'
where title is null or btrim(title) = '';

alter table movies alter column title set not null;
alter table movies alter column body drop not null;

update movies m
set image_url = p.image_url
from (
  select distinct on (movie_id) movie_id, image_url
  from movie_photos
  order by movie_id, sort_order
) p
where m.id = p.movie_id
  and m.image_url is null;
