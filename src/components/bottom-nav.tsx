"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, UserRound } from "lucide-react";
import { useAddFlow } from "@/components/add-flow";
import { cn } from "@/lib/utils";

export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const { openAdd } = useAddFlow();
  const meHref = loggedIn ? "/admin" : "/login";
  const homeActive = !pathname.startsWith("/admin") && !pathname.startsWith("/login");
  const meActive = pathname.startsWith("/admin") || pathname.startsWith("/login");

  return (
    <nav className="glass-surface fixed inset-x-0 bottom-0 z-40 border-t border-[#2F2A24]/10 pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-around">
        <Link
          href="/"
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[13px] font-medium",
            homeActive ? "text-[#B85C38]" : "text-[#6B6258]",
          )}
        >
          <House className="h-6 w-6" />
          ホーム
        </Link>
        {loggedIn ? (
          <button
            type="button"
            onClick={() => openAdd()}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[13px] font-medium text-[#6B6258]"
          >
            <Plus className="h-6 w-6" />
            追加
          </button>
        ) : null}
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
