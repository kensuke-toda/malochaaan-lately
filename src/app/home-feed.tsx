import { getSessionUser } from "@/lib/auth";
import { emptyHomeData, fetchHomeData } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Intent } from "@/types";
import { HomeClient } from "./home-client";

export async function HomeFeed({ intent }: { intent: Intent }) {
  const user = await getSessionUser();
  const [everyone, mine] = await Promise.all([
    fetchHomeData({ intent }),
    user ? fetchHomeData({ createdBy: user.id, intent }) : Promise.resolve(emptyHomeData),
  ]);
  return (
    <HomeClient
      intent={intent}
      everyone={everyone}
      mine={user ? mine : null}
      userId={user?.id ?? null}
      loggedIn={Boolean(user)}
      displayName={user?.displayName ?? null}
      configured={isSupabaseConfigured()}
    />
  );
}
