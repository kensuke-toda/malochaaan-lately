"use client";

import { useEffect, useState } from "react";

export function BootSplash() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHidden(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-[#E8DFD0] transition-opacity duration-300 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F4EEE4] font-display text-3xl font-semibold text-[#B85C38] shadow-sm">
        L
      </div>
    </div>
  );
}
