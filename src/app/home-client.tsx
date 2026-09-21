"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAddFlow } from "@/components/add-flow";
import type { HomeData } from "@/lib/data";
import { authorName, formatDate, toDateKey, todayKey, tokyoNow } from "@/lib/utils";

type HighlightItem = { href: string; label: string };

function itemDate(kind: string, row: { visited_date?: string; entry_date?: string; created_at: string }) {
  if (kind === "place") return toDateKey(row.visited_date ?? row.created_at);
  if (kind === "post") return toDateKey(row.entry_date ?? row.created_at);
  return toDateKey(row.created_at);
}

export function HomeClient({
  data,
  loggedIn,
  displayName,
  configured,
}: {
  data: HomeData;
  loggedIn: boolean;
  displayName: string | null;
  configured: boolean;
}) {
  const now = tokyoNow();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [photo, setPhoto] = useState<{ day: number; index: number } | null>(null);
  const { openAdd } = useAddFlow();

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const calendarItems = useMemo(() => {
    const map: Record<
      string,
      {
        places: HomeData["places"];
        things: HomeData["things"];
        books: HomeData["books"];
        sounds: HomeData["sounds"];
        posts: HomeData["posts"];
        works: HomeData["works"];
      }
    > = {};
    const bump = (key: string) => {
      if (!map[key]) {
        map[key] = { places: [], things: [], books: [], sounds: [], posts: [], works: [] };
      }
      return map[key];
    };
    data.places.forEach((p) => bump(itemDate("place", p)).places.push(p));
    data.things.forEach((p) => bump(itemDate("thing", p)).things.push(p));
    data.books.forEach((p) => bump(itemDate("book", p)).books.push(p));
    data.sounds.forEach((p) => bump(itemDate("sound", p)).sounds.push(p));
    data.posts.forEach((p) => bump(itemDate("post", p)).posts.push(p));
    data.works.forEach((p) => bump(itemDate("work", p)).works.push(p));
    return map;
  }, [data]);

  const highlights = useMemo(() => {
    const inMonth = <T extends { created_at: string }>(rows: T[], kind: string, href: (r: T) => string, label: (r: T) => string) =>
      [...rows]
        .filter((r) => itemDate(kind, r as T & { created_at: string }).startsWith(monthPrefix))
        .sort((a, b) => itemDate(kind, b as T & { created_at: string }).localeCompare(itemDate(kind, a as T & { created_at: string })))
        .slice(0, 5)
        .map((r) => ({ href: href(r), label: label(r) }));

    return {
      places: inMonth(data.places, "place", (r) => `/places/${r.id}`, (r) => r.name),
      things: inMonth(data.things, "thing", (r) => `/things/${r.id}`, (r) => r.name),
      books: inMonth(data.books, "book", (r) => `/books/${r.id}`, (r) => r.title),
      sounds: inMonth(data.sounds, "sound", (r) => `/sounds/${r.id}`, (r) => r.title),
      posts: inMonth(data.posts, "post", (r) => `/posts/${r.id}`, (r) => r.title),
      works: inMonth(data.works, "work", (r) => `/works/${r.id}`, (r) => r.title),
    };
  }, [data, monthPrefix]);

  const hasHighlights = Object.values(highlights).some((list) => list.length > 0);

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey =
    selectedDay != null ? `${monthPrefix}-${String(selectedDay).padStart(2, "0")}` : null;
  const selectedBundle = selectedKey ? calendarItems[selectedKey] : null;

  const photoList =
    photo != null
      ? calendarItems[`${monthPrefix}-${String(photo.day).padStart(2, "0")}`]?.places.filter((p) => p.image_url) ?? []
      : [];
  const photoItem = photoList[photo?.index ?? 0];

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDay(1);
  }

  return (
    <div className="w-full">
      <header className="mb-8">
        <p className="text-sm text-[#6B6258]">Ken とパートナーの近況。行った場所と、好きなもの。</p>
        {displayName ? <p className="mt-1 text-xs text-[#6B6258]">{displayName} としてログイン中</p> : null}
        <p className="mt-1 text-xs text-[#6B6258]/70">更新日：{formatDate(todayKey())}</p>
      </header>

      {!configured && (
        <div className="mb-8 rounded-xl bg-[#F4EEE4] px-4 py-3 text-sm text-[#6B6258]">
          Supabase が未設定です。<code>.env.local</code> に URL とキーを入れてください。画面の骨格はこのまま確認できます。
        </div>
      )}

      <section className="mb-10 text-sm leading-relaxed text-[#3D362E]">
        <p>2人で暮らしている記録です。久しぶりに会う人に「最近何してる？」と聞かれたときに、すぐ思い出せるようにしています。</p>
        {hasHighlights && (
          <>
            <p className="mt-4 font-medium">最近のあれこれ</p>
            <div className="mt-2 divide-y divide-[#2F2A24]/10 rounded-xl bg-[#F4EEE4] px-3">
              <Highlight details="行った場所" items={highlights.places} />
              <Highlight details="モノ" items={highlights.things} />
              <Highlight details="読んだ本" items={highlights.books} />
              <Highlight details="聴いた音楽" items={highlights.sounds} />
              <Highlight details="投稿" items={highlights.posts} />
              <Highlight details="仕事" items={highlights.works} />
            </div>
          </>
        )}
      </section>

      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {[
          ["#places", "Places"],
          ["#things", "Things"],
          ["#books", "Books"],
          ["#sounds", "Sounds"],
          ["#posts", "Posts"],
          ["#works", "Works"],
        ].map(([href, label], i) => (
          <a
            key={href}
            href={href}
            className={
              i === 0
                ? "rounded-full bg-[#2F2A24] px-3 py-1 text-[#F4EEE4]"
                : "rounded-full bg-[#F4EEE4] px-3 py-1 ring-1 ring-[#2F2A24]/10"
            }
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="places" className="mb-16">
        <SectionHead
          title="Places"
          note="行ったお店。日付マスにお店の写真が出ます。"
          loggedIn={loggedIn}
          onAdd={() => openAdd("place")}
        />
        <div className="mb-3 flex items-center justify-between text-sm text-[#6B6258]">
          <button type="button" onClick={() => shiftMonth(-1)} className="px-2 py-1">
            ‹
          </button>
          <span className="font-medium text-[#2F2A24]">
            {cursor.year}年{cursor.month + 1}月
          </span>
          <button type="button" onClick={() => shiftMonth(1)} className="px-2 py-1">
            ›
          </button>
        </div>
        <div className="mb-1 grid w-full grid-cols-7 text-center text-[11px] text-[#6B6258]/70">
          {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid w-full grid-cols-7 gap-1.5 text-center text-sm">
          {cells.map((day, idx) => {
            if (day == null) return <span key={idx} className="aspect-square w-full min-w-0" />;
            const key = `${monthPrefix}-${String(day).padStart(2, "0")}`;
            const bundle = calendarItems[key];
            const placePhotos = (bundle?.places ?? []).filter((p) => p.image_url);
            const cover = placePhotos[0];
            const isSelected = selectedDay === day;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  if (placePhotos.length) setPhoto({ day, index: 0 });
                }}
                className={`relative aspect-square w-full min-w-0 overflow-hidden rounded-md ${isSelected && cover ? "ring-2 ring-[#B85C38]" : ""} ${!cover ? "hover:bg-[#F4EEE4]" : ""}`}
              >
                {cover ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.image_url ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute left-1 top-0.5 text-[10px] font-semibold text-white drop-shadow">{day}</span>
                    {placePhotos.length > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-[#2F2A24]/80 px-1 text-[9px] font-semibold text-[#F4EEE4]">
                        {placePhotos.length}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-0.5">
                    <span>{day}</span>
                    <span className="flex gap-0.5">
                      {(bundle?.things.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#C9A227]" />}
                      {(bundle?.books.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#8B5A6B]" />}
                      {(bundle?.sounds.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#6B7C4F]" />}
                      {(bundle?.posts.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F7C73]" />}
                      {(bundle?.works.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#A65D3F]" />}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#6B6258]">
          <span>写真 = Places（右下の数字 = その日2件以上）</span>
          <span>ドット: Things / Books / Sounds / Posts / Works</span>
        </div>
        <div className="mt-4 text-sm">
          {selectedDay == null ? null : !selectedBundle ? (
            <p className="text-[#6B6258]">
              {cursor.year}年{cursor.month + 1}月{selectedDay}日 の記録はありません
            </p>
          ) : (
            <DayList year={cursor.year} month={cursor.month + 1} day={selectedDay} bundle={selectedBundle} />
          )}
        </div>
      </section>

      <section id="things" className="mb-16">
        <SectionHead title="Things" loggedIn={loggedIn} onAdd={() => openAdd("thing")} />
        {data.things.length ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {data.things.map((thing) => (
              <Link key={thing.id} href={`/things/${thing.id}`} className="group min-w-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {(thing.processed_image_url || thing.original_image_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thing.processed_image_url ?? thing.original_image_url ?? ""}
                      alt={thing.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#F4EEE4]/90 px-2 py-0.5 text-[10px]">
                    {authorName(thing)}
                  </span>
                </div>
                {thing.brand && <p className="mt-2 text-xs text-[#6B6258]">{thing.brand}</p>}
                <p className="text-sm">{thing.name}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="books" className="mb-16">
        <SectionHead title="Books" loggedIn={loggedIn} onAdd={() => openAdd("book")} />
        {data.books.length ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {data.books.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} className="group min-w-0">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {book.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.image_url} alt={book.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#8B5A6B] px-2 py-0.5 text-[10px] text-[#F4EEE4]">
                    {book.status === "reading" ? "読書中" : "読了"}
                  </span>
                </div>
                <p className="mt-2 text-sm">{book.title}</p>
                {book.author && <p className="text-xs text-[#6B6258]">{book.author}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="sounds" className="mb-16">
        <SectionHead title="Sounds" loggedIn={loggedIn} onAdd={() => openAdd("sound")} />
        {data.sounds.length ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {data.sounds.map((sound) => (
              <Link key={sound.id} href={`/sounds/${sound.id}`} className="min-w-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {sound.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sound.image_url} alt={sound.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-2 text-sm">{sound.title}</p>
                {sound.artist && <p className="text-xs text-[#6B6258]">{sound.artist}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="posts" className="mb-16">
        <SectionHead title="Posts" loggedIn={loggedIn} onAdd={() => openAdd("post")} />
        {data.posts.length ? (
          <ul className="flex flex-col gap-4">
            {data.posts.map((post) => (
              <li key={post.id} className="rounded-xl bg-[#F4EEE4] p-4 ring-1 ring-[#2F2A24]/5">
                <Link href={`/posts/${post.id}`} className="block">
                  <p className="text-xs text-[#6B6258]">
                    {authorName(post)} ・ {formatDate(post.entry_date)}
                  </p>
                  <p className="mt-1 font-display font-semibold">{post.title}</p>
                  {post.body && <p className="mt-1 line-clamp-2 text-sm text-[#6B6258]">{post.body}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="works" className="mb-8">
        <SectionHead title="Works" loggedIn={loggedIn} onAdd={() => openAdd("work")} />
        {data.works.length ? (
          <ul className="flex flex-col gap-4">
            {data.works.map((work) => (
              <li key={work.id} className="rounded-xl bg-[#F4EEE4] p-4 ring-1 ring-[#2F2A24]/5">
                <Link href={`/works/${work.id}`} className="block">
                  {work.period_label && <p className="text-xs text-[#6B6258]">{work.period_label}</p>}
                  <p className="mt-1 font-display font-semibold">{work.title}</p>
                  {work.summary && <p className="mt-1 text-sm text-[#6B6258]">{work.summary}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      {photoItem && photo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2A24]/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPhoto(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#F4EEE4] p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#6B6258]">
                  {cursor.year}年{cursor.month + 1}月{photo.day}日
                </p>
                <h3 className="font-display text-lg font-semibold">{photoItem.name}</h3>
              </div>
              <button type="button" onClick={() => setPhoto(null)} className="text-[#6B6258]">
                ✕
              </button>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoItem.image_url ?? ""} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
              {photoList.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#F4EEE4]/90 px-2 py-1 text-sm"
                    onClick={() => setPhoto({ day: photo.day, index: (photo.index - 1 + photoList.length) % photoList.length })}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#F4EEE4]/90 px-2 py-1 text-sm"
                    onClick={() => setPhoto({ day: photo.day, index: (photo.index + 1) % photoList.length })}
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {photoItem.memo && <p className="mt-3 text-sm text-[#3D362E]">{photoItem.memo}</p>}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-xs text-[#6B6258]">
                {photoList.length > 1 ? `${photo.index + 1} / ${photoList.length}` : ""}
              </span>
              <Link href={`/places/${photoItem.id}`} className="underline underline-offset-2">
                詳細を見る →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Highlight({ details, items }: { details: string; items: HighlightItem[] }) {
  if (!items.length) return null;
  return (
    <details className="py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1">
        <span>› {details}</span>
        <span className="text-xs text-[#6B6258]">{items.length}</span>
      </summary>
      <ul className="mt-1 list-disc space-y-0.5 pb-2 pl-5">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link href={item.href} className="underline decoration-[#2F2A24]/20 underline-offset-2">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

function SectionHead({
  title,
  note,
  loggedIn,
  onAdd,
}: {
  title: string;
  note?: string;
  loggedIn: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {note && <p className="text-xs text-[#6B6258]">{note}</p>}
      </div>
      {loggedIn && (
        <button type="button" onClick={onAdd} className="shrink-0 rounded-full bg-[#B85C38] px-3 py-1.5 text-xs font-semibold text-[#F4EEE4]">
          ＋ 追加
        </button>
      )}
    </div>
  );
}

function DayList({
  year,
  month,
  day,
  bundle,
}: {
  year: number;
  month: number;
  day: number;
  bundle: {
    places: HomeData["places"];
    things: HomeData["things"];
    books: HomeData["books"];
    sounds: HomeData["sounds"];
    posts: HomeData["posts"];
    works: HomeData["works"];
  };
}) {
  const rows: { href: string; label: string }[] = [
    ...bundle.places.map((p) => ({ href: `/places/${p.id}`, label: `行った場所：${p.name}` })),
    ...bundle.things.map((p) => ({ href: `/things/${p.id}`, label: `モノ：${p.name}` })),
    ...bundle.books.map((p) => ({ href: `/books/${p.id}`, label: `読んだ本：${p.title}` })),
    ...bundle.sounds.map((p) => ({ href: `/sounds/${p.id}`, label: `聴いた音楽：${p.title}` })),
    ...bundle.posts.map((p) => ({ href: `/posts/${p.id}`, label: `投稿：${p.title}` })),
    ...bundle.works.map((p) => ({ href: `/works/${p.id}`, label: `仕事：${p.title}` })),
  ];
  if (!rows.length) return null;
  return (
    <>
      <p className="mb-2 font-medium">
        {year}年{month}月{day}日の記録
      </p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.href}>
            <Link href={row.href} className="underline decoration-[#2F2A24]/20 underline-offset-2">
              {row.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

