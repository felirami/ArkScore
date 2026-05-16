import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 font-mono text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100",
        className
      )}
      {...props}
    />
  );
}
