import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName } from "@/lib/utils";
import type { Movie } from "@/types";

export const revalidate = 0;

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: movie } = await supabase.from("movies").select("*, profiles(display_name)").eq("id", id).maybeSingle<Movie>();
  if (!movie) notFound();

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href="/#movies" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <div className="mt-6 flex items-start gap-4 sm:gap-5">
        {movie.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.image_url} alt={movie.title} className="w-28 shrink-0 rounded-xl object-cover sm:w-40" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold break-words">{movie.title}</h1>
          <p className="mt-1 text-xs text-[#6B6258]">{authorName(movie)}が投稿</p>
        </div>
      </div>
      {movie.body && <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[#3D362E]">{movie.body}</p>}
    </div>
  );
}
