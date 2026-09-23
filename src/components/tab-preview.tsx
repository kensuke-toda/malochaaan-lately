"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { flushSync } from "react-dom";

export type FeedTab = "/" | "/soon";

type TabPreviewValue = {
  tab: FeedTab | null;
  previewTab: (href: FeedTab) => void;
};

const TabPreviewContext = createContext<TabPreviewValue | null>(null);

export function TabPreviewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [preview, setPreview] = useState<FeedTab | null>(null);
  const desired = useRef<FeedTab | null>(null);

  useEffect(() => {
    if (desired.current && pathname === desired.current) {
      desired.current = null;
      setPreview(null);
      return;
    }
    if (pathname !== "/" && pathname !== "/soon") {
      desired.current = null;
      setPreview(null);
    }
  }, [pathname]);

  function previewTab(href: FeedTab) {
    const current = pathname === "/soon" ? "/soon" : pathname === "/" ? "/" : null;
    if (desired.current === href || (!desired.current && current === href)) return;
    desired.current = href;
    flushSync(() => setPreview(href));
    window.scrollTo(0, 0);
  }

  const onFeed = pathname === "/" || pathname === "/soon";
  const tab: FeedTab | null = onFeed ? (preview ?? (pathname === "/soon" ? "/soon" : "/")) : null;

  return <TabPreviewContext.Provider value={{ tab, previewTab }}>{children}</TabPreviewContext.Provider>;
}

export function useTabPreview() {
  const value = useContext(TabPreviewContext);
  if (!value) throw new Error("useTabPreview must be used within TabPreviewProvider");
  return value;
}
