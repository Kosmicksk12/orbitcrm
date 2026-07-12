"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Primitives";
import { IconLogout, IconSettings } from "@/components/ui/Icons";
import { QuickPartsSearch } from "@/components/inventory/QuickPartsSearch";

export function Topbar({ userEmail, userName }: { userEmail: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur dark:border-line-dark dark:bg-surface-dark/90 sm:px-6 no-print"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold text-white">
          O
        </div>
        <span className="font-display text-base font-semibold text-ink dark:text-ink-dark">
          OrbitCRM
        </span>
      </div>

      <div className="hidden md:block">
        <QuickPartsSearch />
      </div>

      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <QuickPartsSearch />
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Menú de usuario"
          >
            <Avatar name={userName || userEmail} size={34} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-11 w-56 animate-slide-up rounded-xl border border-line bg-surface p-1.5 shadow-popover dark:border-line-dark dark:bg-surface-dark"
            >
              <div className="px-3 py-2 border-b border-line dark:border-line-dark mb-1">
                <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                  {userName || "Tu cuenta"}
                </p>
                <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                  {userEmail}
                </p>
              </div>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-bg dark:text-ink-dark dark:hover:bg-white/5"
              >
                <IconSettings width={16} height={16} />
                Ajustes
              </Link>
              <button
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft dark:hover:bg-danger/10"
              >
                <IconLogout width={16} height={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
