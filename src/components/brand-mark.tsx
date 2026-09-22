import { cn } from "@/lib/utils";

export function BrandMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-[#B85C38] font-display font-semibold leading-none text-[#F4EEE4]",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        fontSize: Math.round(size * 0.58),
        paddingLeft: Math.max(1, Math.round(size * 0.04)),
        paddingBottom: Math.max(1, Math.round(size * 0.02)),
      }}
    >
      L
    </span>
  );
}

export function BrandLockup({
  markSize = 28,
  className,
  textClassName,
}: {
  markSize?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark size={markSize} />
      <span className={cn("font-display font-semibold", textClassName)}>Lately</span>
    </span>
  );
}
