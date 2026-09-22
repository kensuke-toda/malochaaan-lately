"use client";

import Link from "next/link";
import { Children, useMemo, useState, type ReactNode } from "react";
import { useAddFlow } from "@/components/add-flow";
import { useFeedScope } from "@/components/feed-scope";
import type { HomeData } from "@/lib/data";
import { authorName, formatDate, postPreview, postText, toDateKey, todayKey, tokyoNow } from "@/lib/utils";

function itemDate(kind: string, row: { visited_date?: string; entry_date?: string; created_at: string }) {
  if (kind === "place") return toDateKey(row.visited_date ?? row.created_at);
  if (kind === "post" || kind === "movie") return toDateKey(row.entry_date ?? row.created_at);
  return toDateKey(row.created_at);
}

type DayBundle = {
  places: HomeData["places"];
  things: HomeData["things"];
  books: HomeData["books"];
  sounds: HomeData["sounds"];
  podcasts: HomeData["podcasts"];
  posts: HomeData["posts"];
  movies: HomeData["movies"];
  works: HomeData["works"];
};

function emptyBundle(): DayBundle {
  return { places: [], things: [], books: [], sounds: [], podcasts: [], posts: [], movies: [], works: [] };
}

export function HomeClient({
  everyone,
  mine,
  loggedIn,
  displayName,
  configured,
}: {
  everyone: HomeData;
  mine: HomeData | null;
  loggedIn: boolean;
  displayName: string | null;
  configured: boolean;
}) {
  const now = tokyoNow();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [photo, setPhoto] = useState<{ day: number; index: number } | null>(null);
  const { scope } = useFeedScope();
  const { openAdd } = useAddFlow();

  const data = loggedIn && mine && scope === "mine" ? mine : everyone;

  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const calendarItems = useMemo(() => {
    const map: Record<string, DayBundle> = {};
    const bump = (key: string) => {
      if (!map[key]) map[key] = emptyBundle();
      return map[key];
    };
    data.places.forEach((p) => bump(itemDate("place", p)).places.push(p));
    data.things.forEach((p) => bump(itemDate("thing", p)).things.push(p));
    data.books.forEach((p) => bump(itemDate("book", p)).books.push(p));
    data.sounds.forEach((p) => bump(itemDate("sound", p)).sounds.push(p));
    data.podcasts.forEach((p) => bump(itemDate("podcast", p)).podcasts.push(p));
    data.posts.forEach((p) => bump(itemDate("post", p)).posts.push(p));
    data.movies.forEach((p) => bump(itemDate("movie", p)).movies.push(p));
    data.works.forEach((p) => bump(itemDate("work", p)).works.push(p));
    return map;
  }, [data]);

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
        {displayName ? <p className="text-xs text-[#6B6258]">{displayName} としてログイン中</p> : null}
        <p className={`text-xs text-[#6B6258]/70${displayName ? " mt-1" : ""}`}>更新日：{formatDate(todayKey())}</p>
      </header>

      {!configured && (
        <div className="mb-8 rounded-xl bg-[#F4EEE4] px-4 py-3 text-sm text-[#6B6258]">
          Supabase が未設定です。<code>.env.local</code> に URL とキーを入れてください。画面の骨格はこのまま確認できます。
        </div>
      )}

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
                      {(bundle?.podcasts.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F6F8B]" />}
                      {(bundle?.posts.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F7C73]" />}
                      {(bundle?.movies.length ?? 0) > 0 && <i className="inline-block h-1.5 w-1.5 rounded-full bg-[#8B5A7A]" />}
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
          <span>ドット: Things / Books / Movies / Sounds / Podcast / Posts / Works</span>
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
          <CardScroller>
            {data.things.map((thing) => (
              <Link key={thing.id} href={`/things/${thing.id}`} className="group block min-w-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {(thing.processed_image_url || thing.original_image_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thing.processed_image_url ?? thing.original_image_url ?? ""}
                      alt={thing.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <AuthorTag name={authorName(thing)} className="absolute bottom-1.5 left-1.5" />
                </div>
                {thing.brand && <p className="mt-2 text-xs text-[#6B6258]">{thing.brand}</p>}
                <p className="text-sm">{thing.name}</p>
              </Link>
            ))}
          </CardScroller>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="books" className="mb-16">
        <SectionHead title="Books" loggedIn={loggedIn} onAdd={() => openAdd("book")} />
        {data.books.length ? (
          <CardScroller>
            {data.books.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} className="group block min-w-0">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {book.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.image_url} alt={book.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#8B5A6B] px-2 py-0.5 text-[10px] text-[#F4EEE4]">
                    {book.status === "reading" ? "読書中" : "読了"}
                  </span>
                  <AuthorTag name={authorName(book)} className="absolute bottom-1.5 left-1.5" />
                </div>
                <p className="mt-2 text-sm">{book.title}</p>
                {book.author && <p className="text-xs text-[#6B6258]">{book.author}</p>}
              </Link>
            ))}
          </CardScroller>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="movies" className="mb-16">
        <SectionHead title="Movies" loggedIn={loggedIn} onAdd={() => openAdd("movie")} />
        {data.movies.length ? (
          <CardScroller>
            {data.movies.map((movie) => (
              <Link key={movie.id} href={`/movies/${movie.id}`} className="group block min-w-0">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {movie.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={movie.image_url} alt={movie.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <AuthorTag name={authorName(movie)} className="absolute bottom-1.5 left-1.5" />
                </div>
                <p className="mt-2 text-sm">{movie.title}</p>
                {movie.body && <p className="line-clamp-2 text-xs text-[#6B6258]">{movie.body}</p>}
              </Link>
            ))}
          </CardScroller>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="sounds" className="mb-16">
        <SectionHead title="Sounds" loggedIn={loggedIn} onAdd={() => openAdd("sound")} />
        {data.sounds.length ? (
          <CardScroller>
            {data.sounds.map((sound) => (
              <Link key={sound.id} href={`/sounds/${sound.id}`} className="block min-w-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {sound.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sound.image_url} alt={sound.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <AuthorTag name={authorName(sound)} className="absolute bottom-1.5 left-1.5" />
                </div>
                <p className="mt-2 text-sm">{sound.title}</p>
                {sound.artist && <p className="text-xs text-[#6B6258]">{sound.artist}</p>}
              </Link>
            ))}
          </CardScroller>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="podcasts" className="mb-16">
        <SectionHead title="Podcast" loggedIn={loggedIn} onAdd={() => openAdd("podcast")} />
        {data.podcasts.length ? (
          <CardScroller>
            {data.podcasts.map((podcast) => (
              <Link key={podcast.id} href={`/podcasts/${podcast.id}`} className="block min-w-0">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4EEE4]">
                  {podcast.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={podcast.image_url} alt={podcast.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <AuthorTag name={authorName(podcast)} className="absolute bottom-1.5 left-1.5" />
                </div>
                <p className="mt-2 text-sm">{podcast.title}</p>
                {podcast.artist && <p className="text-xs text-[#6B6258]">{podcast.artist}</p>}
              </Link>
            ))}
          </CardScroller>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="posts" className="mb-16">
        <SectionHead title="Posts" loggedIn={loggedIn} onAdd={() => openAdd("post")} />
        {data.posts.length ? (
          <CardScroller full>
            {data.posts.map((post) => {
              const photos = [...(post.post_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
              const cover = photos[0];
              return (
                <Link key={post.id} href={`/posts/${post.id}`} className="block min-w-0 rounded-xl bg-[#F4EEE4] p-4 ring-1 ring-[#2F2A24]/5">
                  {cover ? (
                    <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#E8DFD0]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cover.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <AuthorTag name={authorName(post)} className="absolute bottom-1.5 left-1.5" />
                      {photos.length > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-[#2F2A24]/80 px-1.5 py-0.5 text-[10px] font-semibold text-[#F4EEE4]">
                          {photos.length}
                        </span>
                      )}
                    </div>
                  ) : (
                    <AuthorTag name={authorName(post)} className="bg-[#E8DFD0]" />
                  )}
                  <p className={`${cover ? "mt-0" : "mt-2"} text-xs text-[#6B6258]`}>{formatDate(post.entry_date)}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{postText(post)}</p>
                </Link>
              );
            })}
          </CardScroller>
        ) : (
          <p className="text-sm text-[#6B6258]">まだありません。</p>
        )}
      </section>

      <section id="works" className="mb-8">
        <SectionHead title="Works" loggedIn={loggedIn} onAdd={() => openAdd("work")} />
        {data.works.length ? (
          <CardScroller>
            {data.works.map((work) => (
              <Link key={work.id} href={`/works/${work.id}`} className="block min-w-0">
                <div className="relative flex aspect-square w-full flex-col justify-end overflow-hidden rounded-xl bg-[#F4EEE4] p-3">
                  <AuthorTag name={authorName(work)} className="absolute left-1.5 top-1.5 bg-[#E8DFD0]" />
                  {work.period_label && <p className="text-xs text-[#6B6258]">{work.period_label}</p>}
                  <p className="mt-1 font-display font-semibold leading-snug">{work.title}</p>
                  {work.summary && <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#6B6258]">{work.summary}</p>}
                </div>
              </Link>
            ))}
          </CardScroller>
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
                  {authorName(photoItem)} ・ {cursor.year}年{cursor.month + 1}月{photo.day}日
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

function AuthorTag({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`rounded-full bg-[#F4EEE4]/90 px-2 py-0.5 text-[10px] ${className}`.trim()}>
      {name}
    </span>
  );
}

function CardScroller({ children, full }: { children: ReactNode; full?: boolean }) {
  return (
    <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
      {Children.map(children, (child) => (
        <div
          className={
            full
              ? "flex w-full shrink-0 snap-start flex-col"
              : "flex w-[calc((100%-1.25rem)/2)] shrink-0 snap-start flex-col sm:w-[calc((100%-2.5rem)/3)]"
          }
        >
          {child}
        </div>
      ))}
    </div>
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
  bundle: DayBundle;
}) {
  const rows: { href: string; label: string }[] = [
    ...bundle.places.map((p) => ({ href: `/places/${p.id}`, label: `行った場所：${p.name}` })),
    ...bundle.things.map((p) => ({ href: `/things/${p.id}`, label: `モノ：${p.name}` })),
    ...bundle.books.map((p) => ({ href: `/books/${p.id}`, label: `読んだ本：${p.title}` })),
    ...bundle.movies.map((p) => ({ href: `/movies/${p.id}`, label: `映画：${p.title}` })),
    ...bundle.sounds.map((p) => ({ href: `/sounds/${p.id}`, label: `聴いた音楽：${p.title}` })),
    ...bundle.podcasts.map((p) => ({ href: `/podcasts/${p.id}`, label: `ポッドキャスト：${p.title}` })),
    ...bundle.posts.map((p) => ({ href: `/posts/${p.id}`, label: `投稿：${postPreview(p)}` })),
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

