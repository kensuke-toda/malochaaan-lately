"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const FEED_SCOPE_KEY = "lately.feedScope";
export type FeedScope = "mine" | "everyone";

type FeedScopeValue = {
  loggedIn: boolean;
  scope: FeedScope;
  changeScope: (scope: FeedScope) => void;
};

const FeedScopeContext = createContext<FeedScopeValue | null>(null);

export function useFeedScope() {
  const value = useContext(FeedScopeContext);
  if (!value) throw new Error("useFeedScope must be used within FeedScopeProvider");
  return value;
}

export function FeedScopeProvider({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: ReactNode;
}) {
  const [scope, setScope] = useState<FeedScope>(loggedIn ? "mine" : "everyone");

  useEffect(() => {
    if (!loggedIn) {
      setScope("everyone");
      return;
    }
    const saved = window.localStorage.getItem(FEED_SCOPE_KEY);
    if (saved === "mine" || saved === "everyone") setScope(saved);
  }, [loggedIn]);

  function changeScope(next: FeedScope) {
    setScope(next);
    window.localStorage.setItem(FEED_SCOPE_KEY, next);
  }

  return <FeedScopeContext.Provider value={{ loggedIn, scope, changeScope }}>{children}</FeedScopeContext.Provider>;
}

export function FeedScopeBar() {
  const { scope, changeScope } = useFeedScope();
  const options: { id: FeedScope; label: string }[] = [
    { id: "mine", label: "自分の投稿だけ" },
    { id: "everyone", label: "みんなの投稿も表示" },
  ];
  return (
    <div
      className="grid grid-cols-2 rounded-full bg-[#E8DFD0] p-1 text-xs sm:text-sm"
      role="radiogroup"
      aria-label="表示する投稿"
    >
      {options.map((option) => {
        const on = scope === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => changeScope(option.id)}
            className={`min-h-11 rounded-full px-2 py-2 font-medium sm:px-3 ${
              on ? "bg-[#2F2A24] text-[#F4EEE4]" : "text-[#6B6258]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
