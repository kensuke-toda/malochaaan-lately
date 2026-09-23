import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Book, Intent, Movie, Pin, Place, Podcast, Post, Sound, Thing, Work } from "@/types";

const PROFILE = "profiles(display_name)";

export type HomeData = {
  things: Thing[];
  places: Place[];
  books: Book[];
  sounds: Sound[];
  podcasts: Podcast[];
  posts: Post[];
  movies: Movie[];
  works: Work[];
  pins: Pin[];
};

export const emptyHomeData: HomeData = {
  things: [],
  places: [],
  books: [],
  sounds: [],
  podcasts: [],
  posts: [],
  movies: [],
  works: [],
  pins: [],
};

function byIntent<T extends { intent?: Intent }>(rows: T[] | null, intent?: Intent) {
  const list = rows ?? [];
  if (!intent) return list;
  return list.filter((row) => (row.intent ?? "happened") === intent);
}

export async function fetchHomeData(options: { createdBy?: string; intent?: Intent } = {}): Promise<HomeData> {
  if (!isSupabaseConfigured()) return emptyHomeData;

  const supabase = createClient();
  const { createdBy, intent } = options;

  async function load(filterIntent: boolean) {
    const scoped = (query: any) => {
      let next = createdBy ? query.eq("created_by", createdBy) : query;
      if (filterIntent && intent) next = next.eq("intent", intent);
      return next;
    };
    const placeOrder = intent === "want" ? "created_at" : "visited_date";
    return Promise.all([
      scoped(supabase.from("things").select(`*, ${PROFILE}`)).order("sort_order").order("created_at", { ascending: false }).limit(24),
      scoped(supabase.from("places").select(`*, ${PROFILE}`)).order(placeOrder, { ascending: false }).limit(24),
      scoped(supabase.from("books").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
      scoped(supabase.from("sounds").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
      scoped(supabase.from("podcasts").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
      scoped(supabase.from("posts").select(`*, post_photos(*), ${PROFILE}`)).order("entry_date", { ascending: false }).limit(24),
      scoped(supabase.from("movies").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
      scoped(supabase.from("works").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
    ]);
  }

  let rows = await load(Boolean(intent));
  if (rows.some((row) => row.error?.message.toLowerCase().includes("intent"))) {
    rows = await load(false);
  }

  const [things, places, books, sounds, podcasts, posts, movies, works] = rows;
  const pinsQuery = createdBy
    ? supabase.from("pins").select(`*, ${PROFILE}`).eq("created_by", createdBy)
    : supabase.from("pins").select(`*, ${PROFILE}`);
  const pins = await pinsQuery.order("z_index").limit(48);

  return {
    things: byIntent(things.data as Thing[], intent),
    places: byIntent(places.data as Place[], intent),
    books: byIntent(books.data as Book[], intent),
    sounds: byIntent(sounds.data as Sound[], intent),
    podcasts: byIntent(podcasts.data as Podcast[], intent),
    posts: byIntent(posts.data as Post[], intent),
    movies: byIntent(movies.data as Movie[], intent),
    works: byIntent(works.data as Work[], intent),
    pins: pins.error ? [] : ((pins.data as Pin[]) ?? []),
  };
}
