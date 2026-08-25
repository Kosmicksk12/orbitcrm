"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent to-accent-600 text-white shadow-button hover:from-accent-600 hover:to-accent-700 active:to-accent-700 disabled:from-accent/50 disabled:to-accent/50 disabled:shadow-none",
  secondary:
    "bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-ink dark:text-ink-dark shadow-card hover:bg-bg hover:border-line dark:hover:bg-white/5",
  ghost: "text-ink dark:text-ink-dark hover:bg-black/5 dark:hover:bg-white/10",
  danger: "bg-danger text-white shadow-card hover:bg-danger/90 disabled:bg-danger/50",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-150 active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:active:scale-100",
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
