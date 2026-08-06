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
    <aside className="no-print hidden w-64 shrink-0 bg-nav dark:bg-nav-dark dark:border-r dark:border-line-dark md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <Logo size={32} />
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          OrbitCRM
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent-400 bg-white/10 text-white"
                  : "border-transparent text-white/60 hover:bg-white/5 hover:text-white/90"
              )}
            >
              <Icon width={18} height={18} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 text-xs text-white/40">
        OrbitCRM v1.0
      </div>
    </aside>
  );
}

export { NAV_ITEMS };
