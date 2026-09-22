-- Posts: タイトルを廃止し、本文のみにする（ツイート相当）
-- 既存DB向け。新規セットアップは schema.sql を使う。

update posts
set body = title
where (body is null or btrim(body) = '')
  and title is not null
  and btrim(title) <> '';

alter table posts
  alter column body set not null;

alter table posts
  drop column if exists title;
