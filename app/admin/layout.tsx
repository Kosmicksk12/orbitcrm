import Link from "next/link";
import { IconArrowLeft } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Administración" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-ink dark:bg-bg-dark dark:text-ink-dark">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur dark:border-line-dark dark:bg-surface-dark/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-lg font-semibold">Danivo · Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark"
          >
            <IconArrowLeft width={16} height={16} />
            Volver al taller
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
