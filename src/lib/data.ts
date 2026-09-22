import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Book, Movie, Place, Podcast, Post, Sound, Thing, Work } from "@/types";

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
};

export async function fetchHomeData(options: { createdBy?: string } = {}): Promise<HomeData> {
  if (!isSupabaseConfigured()) return emptyHomeData;

  const supabase = createClient();
  const { createdBy } = options;
  const byAuthor = (query: any) => (createdBy ? query.eq("created_by", createdBy) : query);

  const [things, places, books, sounds, podcasts, posts, movies, works] = await Promise.all([
    byAuthor(supabase.from("things").select(`*, ${PROFILE}`)).order("sort_order").order("created_at", { ascending: false }).limit(24),
    byAuthor(supabase.from("places").select(`*, ${PROFILE}`)).order("visited_date", { ascending: false }).limit(24),
    byAuthor(supabase.from("books").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
    byAuthor(supabase.from("sounds").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
    byAuthor(supabase.from("podcasts").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
    byAuthor(supabase.from("posts").select(`*, post_photos(*), ${PROFILE}`)).order("entry_date", { ascending: false }).limit(24),
    byAuthor(supabase.from("movies").select(`*, movie_photos(*), ${PROFILE}`)).order("entry_date", { ascending: false }).limit(24),
    byAuthor(supabase.from("works").select(`*, ${PROFILE}`)).order("created_at", { ascending: false }).limit(24),
  ]);

  return {
    things: (things.data as Thing[]) ?? [],
    places: (places.data as Place[]) ?? [],
    books: (books.data as Book[]) ?? [],
    sounds: (sounds.data as Sound[]) ?? [],
    podcasts: (podcasts.data as Podcast[]) ?? [],
    posts: (posts.data as Post[]) ?? [],
    movies: (movies.data as Movie[]) ?? [],
    works: (works.data as Work[]) ?? [],
  };
}
