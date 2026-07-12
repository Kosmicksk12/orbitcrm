import { cn, initials } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line dark:border-line-dark bg-surface dark:bg-surface-dark shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-bg dark:bg-white/5 text-ink-muted dark:text-ink-dark-muted",
  accent: "bg-accent-50 dark:bg-accent/15 text-accent-700 dark:text-accent-400",
  success: "bg-success-soft dark:bg-success/15 text-success",
  warning: "bg-warning-soft dark:bg-warning/15 text-warning",
  danger: "bg-danger-soft dark:bg-danger/15 text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-50 font-mono font-medium text-accent-700 dark:bg-accent/20 dark:text-accent-400"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name) || "?"}
    </div>
  );
}
