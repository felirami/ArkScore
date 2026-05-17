import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_24px_rgba(45,226,166,0.18)] hover:bg-[var(--accent-bright)]",
  secondary:
    "border-[var(--border)] bg-[var(--panel-raised)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--panel-soft)]",
  ghost:
    "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[rgba(45,226,166,0.08)]",
  danger:
    "border-transparent bg-[var(--avalanche)] text-white hover:bg-[#c62834]",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.98]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
