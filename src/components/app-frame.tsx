"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export function AppFrame({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full w-full">
      <AppHeader loggedIn={loggedIn} />
      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-28 sm:pb-8">{children}</main>
      <BottomNav loggedIn={loggedIn} />
    </div>
  );
}
