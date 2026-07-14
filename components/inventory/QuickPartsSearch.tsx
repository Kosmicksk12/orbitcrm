"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconBox, IconSearch, IconUsers, IconWrench } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Primitives";
import { ORDER_STATUSES, type InventoryProduct, type ServiceOrder } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { setPendingSearch } from "@/lib/searchBridge";

interface ClientLite {
  name: string;
  phone: string;
  ordersCount: number;
}

/**
 * Global Ctrl+K search across the three things a shop owner looks up all
 * day: repuestos (inventory), órdenes and clientes — all read directly from
 * Supabase, nothing is ever guessed or invented.
 */
export function QuickPartsSearch() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
      if (!loaded) load();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
    }
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function load() {
    setLoading(true);
    const [productsRes, ordersRes] = await Promise.all([
      supabase.from("inventory_products").select("*").order("name"),
      supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setProducts((productsRes.data ?? []) as InventoryProduct[]);
    setOrders((ordersRes.data ?? []) as ServiceOrder[]);
    setLoaded(true);
    setLoading(false);
  }

  const clients = useMemo(() => {
    const byPhone = new Map<string, ClientLite>();
    for (const o of orders) {
      const existing = byPhone.get(o.client_phone);
      if (existing) existing.ordersCount++;
      else byPhone.set(o.client_phone, { name: o.client_name, phone: o.client_phone, ordersCount: 1 });
    }
    return Array.from(byPhone.values());
  }, [orders]);

  const q = query.trim().toLowerCase();

  const productResults = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.detail?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : products.slice(0, 4);

  const orderResults = q
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.client_name.toLowerCase().includes(q) ||
          o.client_phone.includes(q) ||
          `${o.device_brand ?? ""} ${o.device_model ?? ""}`.toLowerCase().includes(q)
      )
    : orders.slice(0, 4);

  const clientResults = q
    ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    : clients.slice(0, 4);

  const hasAnyResults = productResults.length + orderResults.length + clientResults.length > 0;

  function goToOrder(o: ServiceOrder) {
    setPendingSearch("orders", o.order_number);
    setOpen(false);
    router.push("/orders");
  }

  function goToClient(c: ClientLite) {
    setPendingSearch("clients", c.phone);
    setOpen(false);
    router.push("/clients");
  }

  if (typeof document === "undefined") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="no-print flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-bg dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark-muted dark:hover:bg-white/5"
        aria-label="Buscar en OrbitCRM"
      >
        <IconSearch width={15} height={15} />
        <span className="hidden sm:inline">Buscar repuesto, orden o cliente…</span>
        <span className="sm:hidden">Buscar…</span>
        <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-muted dark:border-line-dark sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open &&
        createPortal(
          <div className="no-print fixed inset-0 z-[70] flex items-start justify-center px-4 pt-24">
            <div
              className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm dark:bg-black/60"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Buscar en OrbitCRM"
              className="relative z-10 w-full max-w-xl animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-popover dark:border-line-dark dark:bg-surface-dark"
            >
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 dark:border-line-dark">
                <IconSearch width={17} height={17} className="shrink-0 text-ink-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca un repuesto, una orden o un cliente…"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted dark:text-ink-dark dark:placeholder:text-ink-dark-muted"
                />
                <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-muted dark:border-line-dark sm:inline">
                  Esc
                </kbd>
              </div>

              <div className="max-h-96 overflow-y-auto p-2">
                {loading ? (
                  <p className="px-3 py-6 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                    Cargando…
                  </p>
                ) : !hasAnyResults ? (
                  <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                    <IconSearch width={20} height={20} className="text-ink-muted" />
                    <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
                      Sin resultados para &quot;{query}&quot;.
                    </p>
                  </div>
                ) : (
                  <>
                    {clientResults.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
                          Clientes
                        </p>
                        <ul className="space-y-0.5">
                          {clientResults.map((c) => (
                            <li key={c.phone}>
                              <button
                                onClick={() => goToClient(c)}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-bg dark:hover:bg-white/5"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent dark:bg-accent/15">
                                  <IconUsers width={16} height={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                                    {c.name}
                                  </p>
                                  <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                                    {c.phone}
                                  </p>
                                </div>
                                <span className="shrink-0 font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
                                  {c.ordersCount} {c.ordersCount === 1 ? "orden" : "órdenes"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {orderResults.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
                          Órdenes
                        </p>
                        <ul className="space-y-0.5">
                          {orderResults.map((o) => {
                            const device = [o.device_brand, o.device_model].filter(Boolean).join(" ");
                            return (
                              <li key={o.id}>
                                <button
                                  onClick={() => goToOrder(o)}
                                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-bg dark:hover:bg-white/5"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent dark:bg-accent/15">
                                    <IconWrench width={16} height={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                                      {o.order_number} · {o.client_name}
                                    </p>
                                    <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                                      {device || "Sin equipo"}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="font-mono text-xs text-ink dark:text-ink-dark">
                                      {formatCurrency(o.total_cents)}
                                    </span>
                                    <Badge tone={o.status === "pagada" || o.status === "entregado" ? "success" : "accent"}>
                                      {ORDER_STATUSES.find((s) => s.id === o.status)?.label}
                                    </Badge>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {productResults.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
                          Repuestos
                        </p>
                        <ul className="space-y-0.5">
                          {productResults.map((p) => {
                            const outOfStock = p.stock_qty === 0;
                            const lowStock = !outOfStock && p.stock_qty <= p.low_stock_threshold;
                            return (
                              <li key={p.id}>
                                <div className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-bg dark:hover:bg-white/5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent dark:bg-accent/15">
                                    <IconBox width={16} height={16} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                                      {p.name}
                                      {p.brand && (
                                        <span className="font-normal text-ink-muted dark:text-ink-dark-muted">
                                          {" "}
                                          · {p.brand}
                                        </span>
                                      )}
                                    </p>
                                    <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                                      {p.detail || p.category}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <span className="font-mono text-sm font-medium text-ink dark:text-ink-dark">
                                      {p.sale_price_cents > 0 ? formatCurrency(p.sale_price_cents) : "—"}
                                    </span>
                                    <Badge tone={outOfStock ? "danger" : lowStock ? "warning" : "success"}>
                                      {outOfStock ? "Sin stock" : `${p.stock_qty} en stock`}
                                    </Badge>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-line px-4 py-2.5 text-xs text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                Consulta en vivo tus datos reales — nunca inventa precios ni stock.
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
