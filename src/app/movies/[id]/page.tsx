import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isWantRow, stripWantMark } from "@/lib/intent";
import { authorName } from "@/lib/utils";
import type { Movie } from "@/types";

export const revalidate = 0;

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: movie } = await supabase.from("movies").select("*, profiles(display_name)").eq("id", id).maybeSingle<Movie>();
  if (!movie) notFound();
  const title = stripWantMark(movie.title);
  const body = stripWantMark(movie.body);

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href={isWantRow(movie) ? "/soon#movies" : "/#movies"} className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      {movie.image_url ? (
        <div className="relative mt-6 aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={movie.image_url} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : null}
      <h1 className="mt-6 font-display text-2xl font-semibold break-words">{title}</h1>
      <p className="mt-1 text-xs text-[#6B6258]">{authorName(movie)}が投稿</p>
      {body ? <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[#3D362E]">{body}</p> : null}
    </div>
  );
}
