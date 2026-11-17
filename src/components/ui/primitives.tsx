import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-line bg-white/[0.03] text-muted",
        neon: "border-neon/30 bg-neon/10 text-neon",
        ember: "border-ember/30 bg-ember/10 text-ember",
        danger: "border-danger/30 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-ink-900/80", className)} {...props} />;
}

const field =
  "w-full rounded-lg border border-line bg-ink-850 px-3 text-sm text-fg placeholder:text-subtle transition-colors focus:border-neon/50 focus:outline-none focus:ring-2 focus:ring-neon/20 disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "h-10 appearance-none bg-ink-850 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-muted", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: "neutral" | "neon" | "ember" | "danger";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-white/[0.03] text-muted",
    neon: "border-neon/25 bg-neon/[0.06] text-neon",
    ember: "border-ember/25 bg-ember/[0.06] text-ember",
    danger: "border-danger/25 bg-danger/[0.07] text-danger",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1", "text-[13px] leading-relaxed opacity-90")}>{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-white/[0.05]", className)} />;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-subtle [&_svg]:size-6">{icon}</div> : null}
      <p className="text-sm font-medium text-fg">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-[13px] text-muted">{children}</div> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h2>
      {children ? <p className="mt-4 text-[15px] leading-relaxed text-muted">{children}</p> : null}
    </div>
  );
}
