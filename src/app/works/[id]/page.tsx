import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authorName } from "@/lib/utils";
import type { Work } from "@/types";

export const revalidate = 0;

export default async function WorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = createClient();
  const { data: work } = await supabase.from("works").select("*, profiles(display_name)").eq("id", id).maybeSingle<Work>();
  if (!work) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Link href="/#works" className="text-sm text-[#6B6258]">
        ← 戻る
      </Link>
      <p className="mt-6 text-xs text-[#6B6258]">
        {authorName(work)}が投稿{work.period_label ? ` ・ ${work.period_label}` : ""}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold">{work.title}</h1>
      {work.summary && <p className="mt-4 text-sm leading-relaxed text-[#3D362E]">{work.summary}</p>}
    </div>
  );
}
