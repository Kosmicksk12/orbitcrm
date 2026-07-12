"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { IconBox, IconSearch } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Primitives";
import type { InventoryProduct } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function QuickPartsSearch() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K shortcut, works from anywhere in the app.
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
    const { data } = await supabase.from("inventory_products").select("*").order("name");
    setProducts((data ?? []) as InventoryProduct[]);
    setLoaded(true);
    setLoading(false);
  }

  const q = query.trim().toLowerCase();
  const results = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.detail?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : products.slice(0, 8);

  if (typeof document === "undefined") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="no-print flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-bg dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark-muted dark:hover:bg-white/5"
        aria-label="Buscar repuesto en inventario"
      >
        <IconSearch width={15} height={15} />
        <span className="hidden sm:inline">Buscar repuesto…</span>
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
              aria-label="Buscar repuesto en inventario"
              className="relative z-10 w-full max-w-lg animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-popover dark:border-line-dark dark:bg-surface-dark"
            >
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3 dark:border-line-dark">
                <IconSearch width={17} height={17} className="shrink-0 text-ink-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca por producto, marca o detalle…"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted dark:text-ink-dark dark:placeholder:text-ink-dark-muted"
                />
                <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-muted dark:border-line-dark sm:inline">
                  Esc
                </kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {loading ? (
                  <p className="px-3 py-6 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                    Cargando inventario…
                  </p>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                    <IconBox width={20} height={20} className="text-ink-muted" />
                    <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
                      {q ? "Sin resultados en el inventario." : "Aún no tienes productos en el inventario."}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {results.map((p) => {
                      const outOfStock = p.stock_qty === 0;
                      const lowStock = !outOfStock && p.stock_qty <= p.low_stock_threshold;
                      return (
                        <li
                          key={p.id}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-bg dark:hover:bg-white/5"
                        >
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
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="border-t border-line px-4 py-2.5 text-xs text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                Consulta en vivo tu inventario real — nunca inventa precios ni stock.
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
