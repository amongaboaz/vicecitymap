import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-neon text-ink-950 hover:bg-[#7bf7a2] shadow-[0_0_0_1px_rgb(92_242_139/0.4),0_8px_30px_-10px_rgb(92_242_139/0.6)]",
        secondary: "bg-ink-700 text-fg hover:bg-ink-600 border border-line",
        outline: "border border-line-strong text-fg hover:bg-white/[0.04] hover:border-white/25",
        ghost: "text-muted hover:text-fg hover:bg-white/[0.05]",
        ember: "bg-ember text-ink-950 hover:bg-[#ffa064]",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
