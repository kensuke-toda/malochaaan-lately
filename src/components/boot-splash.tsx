"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

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
      <BrandMark size={64} />
    </div>
  );
}
