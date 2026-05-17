import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  neutral:
    "border-[var(--border)] bg-[var(--panel-raised)] text-[var(--muted-foreground)]",
  success:
    "border-[rgba(45,226,166,0.35)] bg-[rgba(45,226,166,0.10)] text-[var(--accent-bright)]",
  warning:
    "border-[rgba(245,184,75,0.36)] bg-[rgba(245,184,75,0.10)] text-[var(--warning)]",
  danger:
    "border-[rgba(255,107,98,0.38)] bg-[rgba(165,28,36,0.22)] text-[#ffb3ae]",
  info: "border-[rgba(96,165,250,0.35)] bg-[rgba(96,165,250,0.10)] text-[var(--bank-blue)]",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
