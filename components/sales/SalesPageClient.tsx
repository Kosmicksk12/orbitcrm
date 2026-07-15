"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, Skeleton, SkeletonRow } from "@/components/ui/States";
import { IconBox, IconCart, IconPlus, IconSearch, IconTrash } from "@/components/ui/Icons";
import type { InventoryProduct, Sale } from "@/lib/types";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";

interface CartLine {
  product: InventoryProduct;
  quantity: number;
}

export function SalesPageClient() {
  const supabase = createClient();
  const { toast } = useToast();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    const [productsRes, salesRes] = await Promise.all([
      supabase.from("inventory_products").select("*").order("name"),
      supabase
        .from("sales")
        .select("*, sale_items(*)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Products and sales are independent — a failure loading sales history
    // must never block the product search/cart from working.
    if (!productsRes.error) setProducts((productsRes.data ?? []) as InventoryProduct[]);
    if (!salesRes.error) setSales((salesRes.data ?? []) as Sale[]);
    else setError(true);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.detail?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : [];

  function addToCart(product: InventoryProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stock_qty) } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setQuery("");
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(1, Math.min(quantity, l.product.stock_qty)) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const cartTotal = cart.reduce((sum, l) => sum + l.product.sale_price_cents * l.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);

    const { error: err } = await supabase.rpc("create_sale", {
      p_client_name: clientName || null,
      p_items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
    });

    setSubmitting(false);
    if (err) {
      toast({ title: "No se pudo registrar la venta", description: err.message, variant: "danger" });
      return;
    }

    toast({ title: "Venta registrada", description: formatCurrency(cartTotal), variant: "success" });
    setCart([]);
    setClientName("");
    load();
  }

  return (
    <div>
      <PageHeader title="Ventas" description="Vende accesorios sueltos — descuenta el stock automáticamente." />

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-5">
        {/* Carrito / punto de venta */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">
            Nueva venta
          </h2>

          <div className="relative mt-3">
            <IconSearch
              width={16}
              height={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca un producto para agregar…"
              className="pl-9"
              aria-label="Buscar producto"
            />
            {q && (
              <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-popover dark:border-line-dark dark:bg-surface-dark">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                    Sin resultados.
                  </p>
                ) : (
                  searchResults.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={p.stock_qty === 0}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent dark:bg-accent/15">
                        <IconBox width={15} height={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink dark:text-ink-dark">{p.name}</p>
                        <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                          {p.stock_qty === 0 ? "Sin stock" : `${p.stock_qty} en stock`}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-ink dark:text-ink-dark">
                        {formatCurrency(p.sale_price_cents)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                Busca arriba y agrega productos al carrito.
              </p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.product.id}
                  className="flex items-center gap-2 rounded-xl border border-line p-2.5 dark:border-line-dark"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                      {line.product.name}
                    </p>
                    <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                      {formatCurrency(line.product.sale_price_cents)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(line.product.id, line.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:hover:bg-white/5"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono text-sm text-ink dark:text-ink-dark">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(line.product.id, line.quantity + 1)}
                      disabled={line.quantity >= line.product.stock_qty}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30 dark:border-line-dark dark:hover:bg-white/5"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono text-sm text-ink dark:text-ink-dark">
                    {formatCurrency(line.product.sale_price_cents * line.quantity)}
                  </span>
                  <button
                    onClick={() => removeFromCart(line.product.id)}
                    aria-label={`Quitar ${line.product.name}`}
                    className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/10"
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente (opcional)"
                className="mt-3"
              />
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 dark:border-line-dark">
                <span className="text-sm font-medium text-ink dark:text-ink-dark">Total</span>
                <span className="font-mono text-lg font-semibold text-ink dark:text-ink-dark">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <Button className="mt-3 w-full" onClick={handleCheckout} loading={submitting}>
                <IconCart width={16} height={16} />
                Registrar venta
              </Button>
            </>
          )}
        </Card>

        {/* Historial de ventas */}
        <Card className="p-5 lg:col-span-3">
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">
            Historial reciente
          </h2>

          {loading ? (
            <div className="mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState message="No pudimos cargar tus ventas." onRetry={load} />
          ) : sales.length === 0 ? (
            <EmptyState
              icon={<IconCart width={22} height={22} />}
              title="Sin ventas todavía"
              description="Registra tu primera venta desde el carrito de la izquierda."
            />
          ) : (
            <ul className="mt-3 divide-y divide-line dark:divide-line-dark">
              {sales.map((s) => {
                const items = s.sale_items ?? [];
                const summary = items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ");
                return (
                  <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                        {s.client_name || "Cliente sin nombre"}
                      </p>
                      <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                        {summary || "—"}
                      </p>
                      <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                        {formatRelativeTime(s.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold text-ink dark:text-ink-dark">
                      {formatCurrency(s.total_cents)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
