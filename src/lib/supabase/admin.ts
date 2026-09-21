import { createClient } from "@supabase/supabase-js";

/**
 * /admin の Server Action からのみ使う、RLS を迂回する書き込み用クライアント。
 * SUPABASE_SERVICE_ROLE_KEY はクライアントに絶対に漏らさないこと。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
