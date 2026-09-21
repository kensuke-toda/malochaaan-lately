import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName, formatDate } from "@/lib/utils";
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
    <div className="mx-auto max-w-xl px-4 py-16">
      <Link href="/#posts" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <p className="mt-6 text-sm text-[#6B6258]">
        {authorName(post)} ・ {formatDate(post.entry_date)}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold">{post.title}</h1>
      {post.body && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#3D362E]">{post.body}</p>}
      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photo.id} src={photo.image_url} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
