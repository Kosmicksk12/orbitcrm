"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import {
  IconBox,
  IconCart,
  IconDashboard,
  IconReceipt,
  IconSettings,
  IconUsers,
  IconWrench,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Panel", icon: IconDashboard },
  { href: "/orders", label: "Órdenes", icon: IconWrench },
  { href: "/sales", label: "Ventas", icon: IconCart },
  { href: "/expenses", label: "Gastos", icon: IconReceipt },
  { href: "/clients", label: "Clientes", icon: IconUsers },
  { href: "/inventory", label: "Inventario", icon: IconBox },
  { href: "/settings", label: "Ajustes", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print relative hidden w-64 shrink-0 overflow-hidden bg-nav dark:bg-nav-dark dark:border-r dark:border-line-dark md:flex md:flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-accent/25 blur-[90px]"
      />

      <div className="relative flex h-16 shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-6">
        <Logo size={32} />
        <span className="font-display text-lg font-bold tracking-[-0.03em] text-white">
          Danivo
        </span>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-accent to-accent-600 text-white shadow-lg shadow-accent/30"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon
                width={18}
                height={18}
                className={cn(
                  "shrink-0 transition-transform",
                  active ? "text-white" : "text-white/40 group-hover:text-white/80"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/[0.06] px-4 py-3.5 text-xs font-medium tracking-wide text-white/30">
        Danivo CRM v1.0
      </div>
    </aside>
  );
}

export { NAV_ITEMS };
