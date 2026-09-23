import Link from "next/link";
import { isWantDate, isWantRow } from "@/lib/intent";
import { formatDate, postPreview } from "@/lib/utils";
import {
  deleteBookAction,
  deleteMovieAction,
  deletePlaceAction,
  deletePinAction,
  deletePodcastAction,
  deletePostAction,
  deleteSoundAction,
  deleteThingAction,
  deleteWorkAction,
} from "@/app/actions";
import { logoutAction } from "@/app/login/actions";
import { getSessionUser } from "@/lib/auth";
import { fetchHomeData } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const configured = isSupabaseConfigured();
  const data = await fetchHomeData();

  return (
    <div className="w-full py-2">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">自分</h1>
          <p className="mt-1 text-xs text-[#6B6258]">{user.displayName} としてログイン中</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="underline">
            TOPへ
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="underline">
              ログアウト
            </button>
          </form>
        </div>
      </div>

      <p className="mb-8 rounded-xl bg-[#F4EEE4] px-4 py-3 text-xs text-[#6B6258]">
        新規追加は「あったこと」「これから」の「＋追加」から行います。ここでは一覧の確認と、自分の投稿の削除のみできます。
      </p>

      {!configured && (
        <p className="mb-8 rounded-xl bg-[#F4EEE4] px-4 py-3 text-sm text-[#B85C38]">Supabase が未設定のため、データはありません。</p>
      )}

      <AdminList
        title="Cork"
        rows={data.pins.map((p) => ({
          id: p.id,
          label: p.memo?.trim() || "ステッカー",
          mine: p.created_by === user.id,
        }))}
        action={deletePinAction}
      />
      <AdminList
        title="Places"
        rows={data.places.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.visited_date && !isWantDate(p.visited_date) ? `${formatDate(p.visited_date)} ・ ` : ""}${p.name}${p.area ? ` ・ ${p.area}` : ""}`,
          mine: p.created_by === user.id,
        }))}
        action={deletePlaceAction}
      />
      <AdminList
        title="Things"
        rows={data.things.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.brand ? `${p.brand} / ` : ""}${p.name}`,
          mine: p.created_by === user.id,
        }))}
        action={deleteThingAction}
      />
      <AdminList
        title="Books"
        rows={data.books.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.title}${!isWantRow(p) && p.status === "reading" ? "（読書中）" : ""}`,
          mine: p.created_by === user.id,
        }))}
        action={deleteBookAction}
      />
      <AdminList
        title="Movies"
        rows={data.movies.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.title}`,
          mine: p.created_by === user.id,
        }))}
        action={deleteMovieAction}
      />
      <AdminList
        title="Sounds"
        rows={data.sounds.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.artist ? `${p.artist} / ` : ""}${p.title}`,
          mine: p.created_by === user.id,
        }))}
        action={deleteSoundAction}
      />
      <AdminList
        title="Podcast"
        rows={data.podcasts.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.artist ? `${p.artist} / ` : ""}${p.title}`,
          mine: p.created_by === user.id,
        }))}
        action={deletePodcastAction}
      />
      <AdminList
        title="Posts"
        rows={data.posts.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : isWantDate(p.entry_date) ? "" : `${formatDate(p.entry_date)} ・ `}${postPreview(p, 48)}`,
          mine: p.created_by === user.id,
        }))}
        action={deletePostAction}
      />
      <AdminList
        title="Works"
        rows={data.works.map((p) => ({
          id: p.id,
          label: `${isWantRow(p) ? "これから ・ " : ""}${p.title}`,
          mine: p.created_by === user.id,
        }))}
        action={deleteWorkAction}
      />
    </div>
  );
}

function AdminList({
  title,
  rows,
  action,
}: {
  title: string;
  rows: { id: string; label: string; mine: boolean }[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      <ul className="divide-y divide-[#2F2A24]/10 rounded-xl bg-[#F4EEE4]">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <span className="min-w-0 break-words">{row.label}</span>
            {row.mine ? (
              <form action={action} className="shrink-0">
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="text-[#B85C38] underline">
                  削除
                </button>
              </form>
            ) : (
              <span className="text-xs text-[#6B6258]">パートナーの投稿（編集不可）</span>
            )}
          </li>
        ))}
        {!rows.length && <li className="px-4 py-3 text-sm text-[#6B6258]">まだありません</li>}
      </ul>
    </section>
  );
}
