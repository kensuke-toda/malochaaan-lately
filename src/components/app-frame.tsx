"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { TabSwipe } from "@/components/tab-swipe";

function useLockPageZoom() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length <= 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-allow-multitouch]")) return;
      event.preventDefault();
    };
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);
    document.addEventListener("touchstart", preventMultiTouch, { passive: false });
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchstart", preventMultiTouch);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
  }, []);
}

export function AppFrame({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: React.ReactNode;
}) {
  useLockPageZoom();
  const pathname = usePathname();
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full w-full">
      <AppHeader loggedIn={loggedIn} />
      <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-28 sm:pb-8">
        <TabSwipe>{children}</TabSwipe>
      </main>
      <BottomNav loggedIn={loggedIn} />
    </div>
  );
}
