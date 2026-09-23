import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isWantRow, stripWantMark } from "@/lib/intent";
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

export type FeedBundle = {
  happened: { everyone: HomeData; mine: HomeData | null };
  want: { everyone: HomeData; mine: HomeData | null };
  userId: string | null;
  loggedIn: boolean;
  displayName: string | null;
  configured: boolean;
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

function revealWant<T extends { memo?: string | null; body?: string | null; summary?: string | null; title?: string | null }>(row: T): T {
  return {
    ...row,
    ...(row.memo != null ? { memo: stripWantMark(row.memo) || null } : {}),
    ...(row.body != null ? { body: stripWantMark(row.body) || null } : {}),
    ...(row.summary != null ? { summary: stripWantMark(row.summary) || null } : {}),
    ...(row.title != null ? { title: stripWantMark(row.title) } : {}),
  };
}

function byIntent<T extends { intent?: Intent; visited_date?: string | null; entry_date?: string | null; memo?: string | null; body?: string | null; summary?: string | null; title?: string | null }>(
  rows: T[] | null,
  intent?: Intent,
) {
  const list = rows ?? [];
  const filtered = !intent ? list : list.filter((row) => (intent === "want" ? isWantRow(row) : !isWantRow(row)));
  return filtered.map(revealWant);
}

export async function fetchHomeData(
  options: { createdBy?: string; intent?: Intent; includeShared?: boolean } = {},
): Promise<HomeData> {
  if (!isSupabaseConfigured()) return emptyHomeData;

  const supabase = createClient();
  const { createdBy, intent, includeShared = true } = options;
  const scoped = (query: any) => (createdBy ? query.eq("created_by", createdBy) : query);
  const cap = intent === "want" ? 48 : 24;
  const placeOrder = intent === "want" ? "created_at" : "visited_date";
  const listOrder = "created_at";

  const lists = Promise.all([
    scoped(supabase.from("things").select(`*, ${PROFILE}`)).order(intent === "want" ? "created_at" : "sort_order").order("created_at", { ascending: false }).limit(cap),
    scoped(supabase.from("places").select(`*, ${PROFILE}`)).order(placeOrder, { ascending: false }).limit(cap),
    scoped(supabase.from("books").select(`*, ${PROFILE}`)).order(listOrder, { ascending: false }).limit(cap),
    scoped(supabase.from("sounds").select(`*, ${PROFILE}`)).order(listOrder, { ascending: false }).limit(cap),
    scoped(supabase.from("podcasts").select(`*, ${PROFILE}`)).order(listOrder, { ascending: false }).limit(cap),
    scoped(supabase.from("posts").select(`*, post_photos(*), ${PROFILE}`)).order(intent === "want" ? "created_at" : "entry_date", { ascending: false }).limit(cap),
    scoped(supabase.from("movies").select(`*, ${PROFILE}`)).order(listOrder, { ascending: false }).limit(cap),
    scoped(supabase.from("works").select(`*, ${PROFILE}`)).order(listOrder, { ascending: false }).limit(cap),
  ]);
  const shared = includeShared
    ? Promise.all([
        supabase.from("things").select(`*, ${PROFILE}`).eq("brand", CORK_BRAND).order("sort_order").limit(96),
        supabase.from("profiles").select("id, display_name").order("display_name"),
      ])
    : null;

  const [rows, extra] = await Promise.all([lists, shared]);
  const [things, places, books, sounds, podcasts, posts, movies, works] = rows;
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
    pins: ((extra?.[0].data as Thing[]) ?? []).map(thingToPin),
    profiles: (extra?.[1].data as Profile[]) ?? [],
  };
}
