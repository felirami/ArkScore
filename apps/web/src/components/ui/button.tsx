import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[#115e59]",
  secondary:
    "border-[var(--border)] bg-[var(--panel)] text-[var(--foreground)] hover:bg-[#f1f5f9]",
  ghost:
    "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[#e2e8f0]",
  danger:
    "border-transparent bg-[var(--danger)] text-white hover:bg-[#991b1b]"
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
