"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShop } from "@/components/shop/ShopContext";
import { useToast } from "@/components/ui/Toaster";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, Skeleton, SkeletonRow } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconBox, IconCart, IconPlus, IconSearch, IconTrash } from "@/components/ui/Icons";
import type { InventoryProduct, Sale } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface CartLine {
  key: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  productId: string | null; // null = ítem personalizado, no descuenta stock
  maxStock: number | null; // null = sin límite (personalizado)
}

export function SalesPageClient() {
  const supabase = createClient();
  const { toast } = useToast();
  const { isAdmin } = useShop();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Sale | null>(null);

  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

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
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stock_qty) } : l
        );
      }
      return [
        ...prev,
        {
          key: product.id,
          name: product.name,
          unitPriceCents: product.sale_price_cents,
          quantity: 1,
          productId: product.id,
          maxStock: product.stock_qty,
        },
      ];
    });
    setQuery("");
  }

  function addCustomItem() {
    if (!customName.trim()) return;
    const priceCents = Math.round((parseFloat(customPrice || "0") || 0) * 100);
    const qty = Math.max(1, parseInt(customQty || "1", 10) || 1);
    setCart((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        name: customName.trim(),
        unitPriceCents: priceCents,
        quantity: qty,
        productId: null,
        maxStock: null,
      },
    ]);
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setCustomOpen(false);
  }

  function updateQuantity(key: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const capped = l.maxStock != null ? Math.min(quantity, l.maxStock) : quantity;
          return { ...l, quantity: Math.max(1, capped) };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const cartTotal = cart.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);

    const { error: err } = await supabase.rpc("create_sale", {
      p_client_name: clientName || null,
      p_items: cart.map((l) =>
        l.productId
          ? { product_id: l.productId, quantity: l.quantity }
          : {
              product_id: null,
              quantity: l.quantity,
              custom_name: l.name,
              custom_price_cents: l.unitPriceCents,
            }
      ),
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

  async function handleDeleteSale() {
    if (!deleting) return;
    const { error: err } = await supabase.rpc("delete_sale", { p_sale_id: deleting.id });
    if (err) {
      toast({ title: "No se pudo eliminar", description: err.message, variant: "danger" });
    } else {
      toast({ title: "Venta eliminada", description: "El stock de sus productos ya se repuso.", variant: "success" });
      setSales((prev) => prev.filter((s) => s.id !== deleting.id));
      load(); // refresca stock en el buscador de productos
    }
    setDeleting(null);
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
                          {p.detail ? `${p.detail} · ` : ""}
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

          {!customOpen ? (
            <button
              onClick={() => setCustomOpen(true)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent dark:border-line-dark"
            >
              <IconPlus width={13} height={13} />
              Ítem personalizado (no descuenta stock)
            </button>
          ) : (
            <div className="mt-2.5 space-y-2 rounded-xl border border-line p-3 dark:border-line-dark">
              <p className="text-xs font-medium text-ink-muted dark:text-ink-dark-muted">
                Para cosas que no llevas en inventario, como vidrios templados por encargo.
              </p>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej. Vidrio templado iPhone 13"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Precio"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-20"
                  aria-label="Cantidad"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setCustomOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={addCustomItem} disabled={!customName.trim()}>
                  Agregar al carrito
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                Busca arriba y agrega productos al carrito.
              </p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center gap-2 rounded-xl border border-line p-2.5 dark:border-line-dark"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                      {line.name}
                      {line.productId === null && (
                        <span className="ml-1.5 text-xs font-normal text-accent">· personalizado</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                      {formatCurrency(line.unitPriceCents)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(line.key, line.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:hover:bg-white/5"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono text-sm text-ink dark:text-ink-dark">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(line.key, line.quantity + 1)}
                      disabled={line.maxStock != null && line.quantity >= line.maxStock}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30 dark:border-line-dark dark:hover:bg-white/5"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono text-sm text-ink dark:text-ink-dark">
                    {formatCurrency(line.unitPriceCents * line.quantity)}
                  </span>
                  <button
                    onClick={() => removeFromCart(line.key)}
                    aria-label={`Quitar ${line.name}`}
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
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-ink dark:text-ink-dark">
                        {formatCurrency(s.total_cents)}
                      </span>
                      <button
                        onClick={() => setDeleting(s)}
                        disabled={!isAdmin}
                        aria-label="Eliminar venta"
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-soft hover:text-danger disabled:hidden dark:hover:bg-danger/10"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDeleteSale}
        title="Eliminar venta"
        description="Se eliminará esta venta y se repondrá el stock de los productos de inventario que tenía. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
      />
    </div>
  );
}
