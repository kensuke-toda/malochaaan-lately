import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 公開ページ（読み取り専用）用のクライアント。
 * ログイン機能を持たないため、認証Cookieの受け渡しは行わない。
 * RLS により things / diary_entries / diary_photos の SELECT のみ許可される。
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}
