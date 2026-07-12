"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
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
    <html lang="es">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-4 text-center dark:bg-bg-dark">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger dark:bg-danger/15">
            !
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">
            Algo salió mal
          </h1>
          <p className="max-w-sm text-sm text-ink-muted dark:text-ink-dark-muted">
            Ocurrió un error inesperado. Puedes intentar de nuevo o volver más tarde.
          </p>
          <Button onClick={reset} className="mt-2">
            Intentar de nuevo
          </Button>
        </div>
      </body>
    </html>
  );
}
