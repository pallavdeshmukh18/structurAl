import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "error";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
        {
          "border-transparent bg-indigo-600 text-white": variant === "default",
          "border-transparent bg-slate-100 text-slate-900": variant === "secondary",
          "border-transparent bg-emerald-500 text-white": variant === "success",
          "border-transparent bg-amber-500 text-white": variant === "warning",
          "border-transparent bg-rose-500 text-white": variant === "error",
          "text-slate-900": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
