"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, UserRound } from "lucide-react";
import { useAddFlow } from "@/components/add-flow";
import { BrandLockup } from "@/components/brand-mark";
import { FeedScopeBar } from "@/components/feed-scope";
import { cn } from "@/lib/utils";

export function AppHeader({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const { openAdd } = useAddFlow();
  const meHref = loggedIn ? "/admin" : "/login";
  const homeActive = pathname === "/" || pathname.startsWith("/places") || pathname.startsWith("/things") || pathname.startsWith("/books") || pathname.startsWith("/sounds") || pathname.startsWith("/podcasts") || pathname.startsWith("/posts") || pathname.startsWith("/movies") || pathname.startsWith("/works");
  const meActive = pathname.startsWith("/admin") || pathname.startsWith("/login");
  const showFeedScope = loggedIn && pathname === "/";

  return (
    <header className="glass-surface sticky top-0 z-40 border-b border-[#2F2A24]/10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <BrandLockup textClassName="text-xl" />
        </Link>
        <nav className="hidden items-center gap-1 rounded-full bg-[#E8DFD0] p-1 sm:flex">
          <Link
            href="/"
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
              homeActive ? "bg-[#2F2A24] text-[#F4EEE4]" : "text-[#6B6258]",
            )}
          >
            <House className="h-4 w-4" />
            ホーム
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
