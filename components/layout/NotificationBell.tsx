"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { IconBell, IconBox, IconCart, IconDeal } from "@/components/ui/Icons";
import type { InventoryProduct, RequestedProduct, ServiceOrder } from "@/lib/types";

const WARRANTY_SOON_DAYS = 7;

interface NotificationGroup {
  key: string;
  label: string;
  count: number;
  href: string;
  icon: React.ReactNode;
  tone: "warning" | "danger" | "accent";
}

export function NotificationBell() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const [{ data: products }, { data: orders }, { data: requested }] = await Promise.all([
      supabase.from("inventory_products").select("id, stock_qty, low_stock_threshold"),
      supabase
        .from("service_orders")
        .select("id, total_cents, paid_cents, created_at, warranty_days, status"),
      supabase.from("requested_products").select("id, status").eq("status", "pendiente"),
    ]);

    const lowStock = ((products ?? []) as Pick<InventoryProduct, "id" | "stock_qty" | "low_stock_threshold">[]).filter(
      (p) => p.stock_qty <= p.low_stock_threshold
    );

    const allOrders = (orders ?? []) as Pick<
      ServiceOrder,
      "id" | "total_cents" | "paid_cents" | "created_at" | "warranty_days" | "status"
    >[];
    const withBalance = allOrders.filter((o) => o.total_cents > o.paid_cents);

    const now = Date.now();
    const soonMs = WARRANTY_SOON_DAYS * 24 * 60 * 60 * 1000;
    const expiringSoon = allOrders.filter((o) => {
      const expires = new Date(o.created_at).getTime() + o.warranty_days * 24 * 60 * 60 * 1000;
      return expires > now && expires - now <= soonMs;
    });

    const pendingRequests = (requested ?? []) as Pick<RequestedProduct, "id" | "status">[];

    const nextGroups: NotificationGroup[] = [];
    if (lowStock.length > 0) {
      nextGroups.push({
        key: "stock",
        label: "Productos con stock bajo",
        count: lowStock.length,
        href: "/inventory",
        icon: <IconBox width={16} height={16} />,
        tone: "warning",
      });
    }
    if (withBalance.length > 0) {
      nextGroups.push({
        key: "balance",
        label: "Órdenes con saldo pendiente",
        count: withBalance.length,
        href: "/orders",
        icon: <IconDeal width={16} height={16} />,
        tone: "danger",
      });
    }
    if (expiringSoon.length > 0) {
      nextGroups.push({
        key: "warranty",
        label: `Garantías que vencen en ${WARRANTY_SOON_DAYS} días o menos`,
        count: expiringSoon.length,
        href: "/orders",
        icon: <IconBell width={16} height={16} />,
        tone: "warning",
      });
    }
    if (pendingRequests.length > 0) {
      nextGroups.push({
        key: "requested",
        label: "Productos solicitados por clientes",
        count: pendingRequests.length,
        href: "/inventory",
        icon: <IconCart width={16} height={16} />,
        tone: "accent",
      });
    }

    setGroups(nextGroups);
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // Re-check periodically so the badge stays fresh during a long session.
    const interval = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={totalCount > 0 ? `Notificaciones (${totalCount})` : "Notificaciones"}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/10 dark:hover:text-ink-dark"
      >
        <IconBell width={19} height={19} />
        {loaded && totalCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger ring-2 ring-surface dark:ring-surface-dark" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-72 animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-popover dark:border-line-dark dark:bg-surface-dark sm:w-80"
        >
          <p className="px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
            Notificaciones
          </p>
          {!loaded ? (
            <p className="px-2.5 py-4 text-sm text-ink-muted dark:text-ink-dark-muted">Cargando…</p>
          ) : groups.length === 0 ? (
            <p className="px-2.5 py-4 text-sm text-ink-muted dark:text-ink-dark-muted">
              Todo en orden — nada que revisar por ahora.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {groups.map((g) => (
                <li key={g.key}>
                  <Link
                    href={g.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-bg dark:hover:bg-white/5"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        g.tone === "danger"
                          ? "bg-danger-soft text-danger dark:bg-danger/15"
                          : g.tone === "warning"
                            ? "bg-warning-soft text-warning dark:bg-warning/15"
                            : "bg-accent-50 text-accent dark:bg-accent/15"
                      )}
                    >
                      {g.icon}
                    </div>
                    <span className="min-w-0 flex-1 text-sm text-ink dark:text-ink-dark">{g.label}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-ink-muted dark:text-ink-dark-muted">
                      {g.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
