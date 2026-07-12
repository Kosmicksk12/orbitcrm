"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger dark:bg-danger/15">
        !
      </div>
      <h2 className="font-display text-lg font-semibold text-ink dark:text-ink-dark">
        No pudimos cargar esta sección
      </h2>
      <p className="max-w-sm text-sm text-ink-muted dark:text-ink-dark-muted">
        Ocurrió un error inesperado. Intenta de nuevo — si el problema persiste, revisa tu conexión.
      </p>
      <Button onClick={reset} className="mt-1">
        Intentar de nuevo
      </Button>
    </div>
  );
}
