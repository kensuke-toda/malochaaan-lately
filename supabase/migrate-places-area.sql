-- Places にエリア・最寄りを足す。必須ではない。
-- アプリと同じ Supabase プロジェクトの SQL Editor で実行する。

alter table public.places add column if not exists area text;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
select pg_notify('pgrst', 'reload schema');
