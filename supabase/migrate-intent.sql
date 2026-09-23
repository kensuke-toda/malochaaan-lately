-- あったこと / これから を既存テーブルの intent で分ける。
-- アプリと同じ Supabase プロジェクトの SQL Editor で実行する。
-- プロジェクト URL は .env.local の NEXT_PUBLIC_SUPABASE_URL と一致していること。

-- 先に public のテーブル一覧を確認したいとき:
-- select tablename from pg_tables where schemaname = 'public' order by 1;

do $$
declare
  t text;
  found int := 0;
begin
  foreach t in array array['things','places','books','sounds','podcasts','posts','movies','works']
  loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'skip % (table not found)', t;
    else
      execute format('alter table public.%I add column if not exists intent text not null default ''happened''', t);
      found := found + 1;
      raise notice 'ok %', t;
    end if;
  end loop;

  if to_regclass('public.places') is not null then
    execute 'alter table public.places alter column visited_date drop not null';
  end if;

  if found = 0 then
    raise exception 'public に対象テーブルが1つもありません。SQL Editor のプロジェクトがアプリと違う可能性があります。';
  end if;
end $$;
