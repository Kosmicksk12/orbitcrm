import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-4 text-center dark:bg-bg-dark">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">
        No encontramos esta página
      </h1>
      <p className="max-w-xs text-sm text-ink-muted dark:text-ink-dark-muted">
        Puede que el enlace esté roto o que la página se haya movido.
      </p>
      <Link href="/dashboard" className="mt-2">
        <Button>Volver al panel</Button>
      </Link>
    </div>
  );
}
