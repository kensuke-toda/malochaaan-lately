"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const meHref = loggedIn ? "/admin" : "/login";
  const soonActive = pathname === "/soon";
  const meActive = pathname.startsWith("/admin") || pathname.startsWith("/login");
  const happenedActive = !soonActive && !meActive;

  return (
    <nav className="glass-surface fixed inset-x-0 bottom-0 z-40 border-t border-[#2F2A24]/10 pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-around">
        <Link
          href="/"
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[13px] font-medium",
            happenedActive ? "text-[#B85C38]" : "text-[#6B6258]",
          )}
        >
          <CalendarDays className="h-6 w-6" />
          あったこと
        </Link>
        <Link
          href="/soon"
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[13px] font-medium",
            soonActive ? "text-[#B85C38]" : "text-[#6B6258]",
          )}
        >
          <Sparkles className="h-6 w-6" />
          これから
        </Link>
        <Link
          href={meHref}
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[13px] font-medium",
            meActive ? "text-[#B85C38]" : "text-[#6B6258]",
          )}
        >
          <UserRound className="h-6 w-6" />
          {loggedIn ? "自分" : "ログイン"}
        </Link>
      </div>
    </nav>
  );
}
