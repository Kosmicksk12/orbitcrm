import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/**
 * Cascarón para las páginas legales (Términos, Privacidad). El contenido es
 * un BORRADOR con marcadores tipo [TU NEGOCIO] que hay que reemplazar por los
 * datos legales reales antes de cobrarle a nadie.
 */
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg text-ink dark:bg-bg-dark dark:text-ink-dark">
      <header className="border-b border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-lg font-semibold">Danivo</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted dark:text-ink-dark-muted">
          Última actualización: {updated}
        </p>

        <div className="mt-6 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning dark:bg-warning/10">
          Borrador. Reemplaza los campos entre corchetes ([TU NEGOCIO], etc.) por tus datos legales
          reales antes de publicar o cobrar.
        </div>

        <div
          className="mt-8 text-sm leading-relaxed text-ink-muted dark:text-ink-dark-muted [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 dark:[&_h2]:text-ink-dark dark:[&_strong]:text-ink-dark [&_strong]:text-ink"
        >
          {children}
        </div>

        <div className="mt-12 border-t border-line pt-6 text-sm dark:border-line-dark">
          <Link href="/" className="font-medium text-accent hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
