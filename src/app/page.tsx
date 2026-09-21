import { getSessionUser } from "@/lib/auth";
import { fetchHomeData } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HomeClient } from "./home-client";

export const revalidate = 0;

export default async function Home() {
  const [data, user] = await Promise.all([fetchHomeData(), getSessionUser()]);
  return (
    <HomeClient
      data={data}
      loggedIn={Boolean(user)}
      displayName={user?.displayName ?? null}
      configured={isSupabaseConfigured()}
    />
  );
}
