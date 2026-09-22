import { getSessionUser } from "@/lib/auth";
import { emptyHomeData, fetchHomeData } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HomeClient } from "./home-client";

export const revalidate = 0;

export default async function Home() {
  const user = await getSessionUser();
  const [everyone, mine] = await Promise.all([
    fetchHomeData(),
    user ? fetchHomeData({ createdBy: user.id }) : Promise.resolve(emptyHomeData),
  ]);
  return (
    <HomeClient
      everyone={everyone}
      mine={user ? mine : null}
      loggedIn={Boolean(user)}
      displayName={user?.displayName ?? null}
      configured={isSupabaseConfigured()}
    />
  );
}
