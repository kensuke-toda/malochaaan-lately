import { getSessionUser } from "@/lib/auth";
import { fetchHomeData, type FeedBundle } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function loadFeedBundle(): Promise<FeedBundle> {
  const user = await getSessionUser();
  const [happened, want, happenedMine, wantMine] = await Promise.all([
    fetchHomeData({ intent: "happened" }),
    fetchHomeData({ intent: "want", includeShared: false }),
    user ? fetchHomeData({ createdBy: user.id, intent: "happened", includeShared: false }) : Promise.resolve(null),
    user ? fetchHomeData({ createdBy: user.id, intent: "want", includeShared: false }) : Promise.resolve(null),
  ]);

  return {
    happened: { everyone: happened, mine: happenedMine },
    want: { everyone: want, mine: wantMine },
    userId: user?.id ?? null,
    loggedIn: Boolean(user),
    displayName: user?.displayName ?? null,
    configured: isSupabaseConfigured(),
  };
}
