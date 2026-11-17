import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#0F1113" stroke="rgba(255,255,255,0.12)" />
      <path d="M9 9.5 16 23l7-13.5" fill="none" stroke="#5CF28B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="23" r="2.2" fill="#FF8A3D" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="ViceCityMap home">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        ViceCity<span className="text-neon">Map</span>
      </span>
    </Link>
  );
}
