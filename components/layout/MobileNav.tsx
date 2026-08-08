"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./Sidebar";

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.href !== "/settings");

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-nav dark:bg-nav-dark md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-accent-400" : "text-white/50"
            )}
          >
            <Icon width={22} height={22} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
