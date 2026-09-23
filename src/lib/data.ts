import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Book, Intent, Movie, Pin, Place, Podcast, Post, Profile, Sound, Thing, Work } from "@/types";

const PROFILE = "profiles(display_name)";
export const CORK_BRAND = "__cork__";

function parseCorkLayout(raw: string | null) {
  try {
    const value = raw ? JSON.parse(raw) : {};
    return {
      x: typeof value.x === "number" ? value.x : 0.5,
      y: typeof value.y === "number" ? value.y : 0.45,
      scale: typeof value.scale === "number" ? value.scale : 1,
      rotation: typeof value.rotation === "number" ? value.rotation : 0,
    };
  } catch {
    return { x: 0.5, y: 0.45, scale: 1, rotation: 0 };
  }
}

export function thingToPin(thing: Thing): Pin {
  const layout = parseCorkLayout(thing.product_url);
  return {
    id: thing.id,
    image_url: thing.processed_image_url ?? thing.original_image_url ?? "",
    memo: thing.memo,
    ...layout,
    z_index: thing.sort_order,
    created_by: thing.created_by,
    created_at: thing.created_at,
    profiles: thing.profiles,
  };
}

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
  profiles: Profile[];
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
  profiles: [],
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
  const [cork, profiles] = await Promise.all([
    supabase.from("things").select(`*, ${PROFILE}`).eq("brand", CORK_BRAND).order("sort_order").limit(96),
    supabase.from("profiles").select("id, display_name").order("display_name"),
  ]);
  const thingRows = byIntent((things.data as Thing[]) ?? [], intent).filter((row) => row.brand !== CORK_BRAND);

  return {
    things: thingRows,
    places: byIntent(places.data as Place[], intent),
    books: byIntent(books.data as Book[], intent),
    sounds: byIntent(sounds.data as Sound[], intent),
    podcasts: byIntent(podcasts.data as Podcast[], intent),
    posts: byIntent(posts.data as Post[], intent),
    movies: byIntent(movies.data as Movie[], intent),
    works: byIntent(works.data as Work[], intent),
    pins: ((cork.data as Thing[]) ?? []).map(thingToPin),
    profiles: (profiles.data as Profile[]) ?? [],
  };
}
