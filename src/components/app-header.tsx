"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Plus, Sparkles, UserRound } from "lucide-react";
import { useAddFlow } from "@/components/add-flow";
import { BrandLockup } from "@/components/brand-mark";
import { FeedScopeBar } from "@/components/feed-scope";
import { useTabPreview } from "@/components/tab-preview";
import { cn } from "@/lib/utils";

export function AppHeader({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const { tab, previewTab } = useTabPreview();
  const { openAdd } = useAddFlow();
  const meHref = loggedIn ? "/admin" : "/login";
  const soonActive = tab === "/soon";
  const meActive = tab == null && (pathname.startsWith("/admin") || pathname.startsWith("/login"));
  const happenedActive = tab === "/" || (tab == null && !meActive);
  const showFeedScope = loggedIn && (tab === "/" || tab === "/soon");

  return (
    <header className="glass-surface sticky top-0 z-40 border-b border-[#2F2A24]/10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" scroll={false} prefetch onClick={() => previewTab("/")} className="inline-flex min-h-11 items-center">
          <BrandLockup textClassName="text-xl" />
        </Link>
        <nav className="hidden items-center gap-1 rounded-full bg-[#E8DFD0] p-1 sm:flex">
          <Link
            href="/"
            scroll={false}
            prefetch
            onClick={() => previewTab("/")}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              happenedActive ? "bg-[#2F2A24] text-[#F4EEE4]" : "text-[#6B6258]",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            あったこと
          </Link>
          <Link
            href="/soon"
            scroll={false}
            prefetch
            onClick={() => previewTab("/soon")}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              soonActive ? "bg-[#2F2A24] text-[#F4EEE4]" : "text-[#6B6258]",
            )}
          >
            <Sparkles className="h-4 w-4" />
            これから
          </Link>
          {loggedIn ? (
            <button
              type="button"
              onClick={() => openAdd()}
              className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#6B6258]"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          ) : null}
          <Link
            href={meHref}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              meActive ? "bg-[#2F2A24] text-[#F4EEE4]" : "text-[#6B6258]",
            )}
          >
            <UserRound className="h-4 w-4" />
            {loggedIn ? "自分" : "ログイン"}
          </Link>
        </nav>
      </div>
      {showFeedScope ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-3">
          <FeedScopeBar />
        </div>
      ) : null}
    </header>
  );
}
