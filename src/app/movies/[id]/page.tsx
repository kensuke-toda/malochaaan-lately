import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName, formatDate, postText } from "@/lib/utils";
import type { Movie } from "@/types";

export const revalidate = 0;

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: movie } = await supabase
    .from("movies")
    .select("*, movie_photos(*), profiles(display_name)")
    .eq("id", id)
    .maybeSingle<Movie>();
  if (!movie) notFound();
  const photos = [...(movie.movie_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href="/#movies" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <p className="mt-6 text-sm text-[#6B6258]">
        {authorName(movie)} ・ {formatDate(movie.entry_date)}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed break-words">{postText(movie)}</p>
      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
