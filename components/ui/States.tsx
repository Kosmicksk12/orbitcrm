"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-line px-5 py-4 dark:border-line-dark">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent dark:bg-accent/15">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink dark:text-ink-dark">{title}</h3>
        <p className="max-w-xs text-sm text-ink-muted dark:text-ink-dark-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger dark:bg-danger/15">
        !
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink dark:text-ink-dark">
          Algo salió mal
        </h3>
        <p className="max-w-xs text-sm text-ink-muted dark:text-ink-dark-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
