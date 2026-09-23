import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isWantDate, isWantRow } from "@/lib/intent";
import { authorName, formatDate, postText } from "@/lib/utils";
import type { Post } from "@/types";

export const revalidate = 0;

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*, post_photos(*), profiles(display_name)")
    .eq("id", id)
    .maybeSingle<Post>();
  if (!post) notFound();
  const photos = [...(post.post_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto w-full max-w-xl py-2">
      <Link href={isWantRow(post) ? "/soon#posts" : "/#posts"} className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <p className="mt-6 text-sm text-[#6B6258]">
        {authorName(post)}
        {isWantRow(post) || isWantDate(post.entry_date) ? "" : ` ・ ${formatDate(post.entry_date)}`}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed break-words">{postText(post)}</p>
      {photos.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
