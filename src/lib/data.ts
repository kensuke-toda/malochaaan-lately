import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Book, Place, Post, Sound, Thing, Work } from "@/types";

const PROFILE = "profiles(display_name)";

export type HomeData = {
  things: Thing[];
  places: Place[];
  books: Book[];
  sounds: Sound[];
  posts: Post[];
  works: Work[];
};

export async function fetchHomeData(): Promise<HomeData> {
  const empty: HomeData = {
    things: [],
    places: [],
    books: [],
    sounds: [],
    posts: [],
    works: [],
  };
  if (!isSupabaseConfigured()) return empty;

  const supabase = createClient();
  const [things, places, books, sounds, posts, works] = await Promise.all([
    supabase.from("things").select(`*, ${PROFILE}`).order("sort_order").order("created_at", { ascending: false }).limit(24),
    supabase.from("places").select(`*, ${PROFILE}`).order("visited_date", { ascending: false }).limit(24),
    supabase.from("books").select(`*, ${PROFILE}`).order("created_at", { ascending: false }).limit(24),
    supabase.from("sounds").select(`*, ${PROFILE}`).order("created_at", { ascending: false }).limit(24),
    supabase.from("posts").select(`*, post_photos(*), ${PROFILE}`).order("entry_date", { ascending: false }).limit(24),
    supabase.from("works").select(`*, ${PROFILE}`).order("created_at", { ascending: false }).limit(24),
  ]);

  return {
    things: (things.data as Thing[]) ?? [],
    places: (places.data as Place[]) ?? [],
    books: (books.data as Book[]) ?? [],
    sounds: (sounds.data as Sound[]) ?? [],
    posts: (posts.data as Post[]) ?? [],
    works: (works.data as Work[]) ?? [],
  };
}
