"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTabPreview } from "@/components/tab-preview";

function inHorizontalScroller(target: EventTarget | null) {
  let el = target instanceof Element ? target : null;
  while (el) {
    if (el.hasAttribute("data-no-tab-swipe")) return true;
    const style = window.getComputedStyle(el);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 8) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function TabSwipe({ children }: { children: ReactNode }) {
  const { tab, previewTab } = useTabPreview();
  const router = useRouter();
  const start = useRef<{ x: number; y: number; ignore: boolean } | null>(null);
  const onTabs = tab === "/" || tab === "/soon";

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/soon");
  }, [router]);

  if (!onTabs) return <>{children}</>;

  return (
    <div
      onTouchStart={(e) => {
        const touch = e.changedTouches[0];
        start.current = { x: touch.clientX, y: touch.clientY, ignore: inHorizontalScroller(e.target) };
      }}
      onTouchEnd={(e) => {
        const origin = start.current;
        start.current = null;
        if (!origin || origin.ignore) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - origin.x;
        const dy = touch.clientY - origin.y;
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
        if (tab === "/" && dx < 0) {
          previewTab("/soon");
          router.push("/soon", { scroll: false });
        }
        if (tab === "/soon" && dx > 0) {
          previewTab("/");
          router.push("/", { scroll: false });
        }
      }}
    >
      {children}
    </div>
  );
}
