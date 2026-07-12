"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProductForm, type ProductFormValues } from "./ProductForm";
import { ImportExcelModal } from "./ImportExcelModal";
import { IconAlertTriangle, IconBox, IconEdit, IconPlus, IconSearch, IconTrash, IconUpload } from "@/components/ui/Icons";
import type { InventoryProduct } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function InventoryPageClient() {
  const supabase = createClient();
  const { toast } = useToast();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [deleting, setDeleting] = useState<InventoryProduct | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("inventory_products")
      .select("*")
      .order("name");
    if (err) setError(true);
    else setProducts((data ?? []) as InventoryProduct[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.detail?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesCategory = !category || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock_qty <= p.low_stock_threshold),
    [products]
  );
  const totalStock = products.reduce((sum, p) => sum + p.stock_qty, 0);

  async function handleSubmit(values: ProductFormValues) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name: values.name.trim(),
      brand: values.brand.trim() || null,
      category: values.category.trim() || "General",
      detail: values.detail.trim() || null,
      sale_price_cents: Math.round((parseFloat(values.sale_price || "0") || 0) * 100),
      stock_qty: parseInt(values.stock_qty || "0", 10) || 0,
      low_stock_threshold: parseInt(values.low_stock_threshold || "0", 10) || 0,
    };

    if (editing) {
      const { error: err } = await supabase.from("inventory_products").update(payload).eq("id", editing.id);
      if (err) {
        toast({ title: "No se pudo actualizar", description: err.message, variant: "danger" });
        return;
      }
      toast({ title: "Producto actualizado", variant: "success" });
    } else {
      const { error: err } = await supabase.from("inventory_products").insert({ ...payload, owner_id: user.id });
      if (err) {
        toast({ title: "No se pudo crear el producto", description: err.message, variant: "danger" });
        return;
      }
      toast({ title: "Producto agregado", variant: "success" });
    }

    setFormOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error: err } = await supabase.from("inventory_products").delete().eq("id", deleting.id);
    if (err) {
      toast({ title: "No se pudo eliminar", description: err.message, variant: "danger" });
    } else {
      toast({ title: "Producto eliminado", variant: "success" });
      setProducts((prev) => prev.filter((p) => p.id !== deleting.id));
    }
    setDeleting(null);
  }

  async function adjustStock(product: InventoryProduct, delta: number) {
    const nextQty = Math.max(0, product.stock_qty + delta);
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock_qty: nextQty } : p)));
    const { error: err } = await supabase
      .from("inventory_products")
      .update({ stock_qty: nextQty })
      .eq("id", product.id);
    if (err) {
      setProducts(previous);
      toast({ title: "No se pudo actualizar el stock", description: err.message, variant: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        description={`${products.length} ${products.length === 1 ? "producto" : "productos"} registrados`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <IconUpload width={16} height={16} />
              Importar Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <IconPlus width={16} height={16} />
              Agregar producto
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted">Productos</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
              {products.length}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted">Stock total</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
              {totalStock}
            </p>
          </Card>
          <Card className={cn("p-5", lowStockProducts.length > 0 && "border-warning/40 bg-warning-soft/40 dark:bg-warning/5")}>
            <p className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted">Stock bajo</p>
            <p className="mt-2 font-mono text-2xl font-semibold text-warning">
              {lowStockProducts.length}
            </p>
          </Card>
        </div>

        {lowStockProducts.length > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning dark:bg-warning/10">
            <IconAlertTriangle width={16} height={16} className="mt-0.5 shrink-0" />
            <p>
              Alerta de stock bajo:{" "}
              {lowStockProducts
                .slice(0, 4)
                .map((p) => p.name)
                .join(", ")}
              {lowStockProducts.length > 4 && ` y ${lowStockProducts.length - 4} más.`}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <IconSearch
              width={16}
              height={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por producto, marca, detalle…"
              className="pl-9"
              aria-label="Buscar productos"
            />
          </div>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:w-56"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <Card className="mt-4 overflow-x-auto">
          {loading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState message="No pudimos cargar tu inventario." onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconBox width={22} height={22} />}
              title={query || category ? "Sin resultados" : "Aún no tienes productos"}
              description={
                query || category
                  ? "Intenta con otro término o categoría."
                  : "Agrega tu primer producto o repuesto al inventario."
              }
              action={
                !query &&
                !category && (
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <IconPlus width={16} height={16} />
                    Agregar producto
                  </Button>
                )
              }
            />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                  <th className="px-5 py-3 font-medium">Producto</th>
                  <th className="px-3 py-3 font-medium">Categoría</th>
                  <th className="px-3 py-3 font-medium">Detalle</th>
                  <th className="px-3 py-3 font-medium">Venta</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line-dark">
                {filtered.map((p) => (
                  <tr key={p.id} className={cn(p.stock_qty <= p.low_stock_threshold && "bg-warning-soft/30 dark:bg-warning/5")}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink dark:text-ink-dark">{p.name}</p>
                      {p.brand && (
                        <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{p.brand}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-muted dark:text-ink-dark-muted">{p.category}</td>
                    <td className="px-3 py-3 text-ink-muted dark:text-ink-dark-muted">{p.detail || "—"}</td>
                    <td className="px-3 py-3 font-mono text-ink dark:text-ink-dark">
                      {p.sale_price_cents > 0 ? formatCurrency(p.sale_price_cents) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjustStock(p, -1)}
                          aria-label={`Restar stock a ${p.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:hover:bg-white/5"
                        >
                          −
                        </button>
                        <span
                          className={cn(
                            "w-8 text-center font-mono font-medium",
                            p.stock_qty <= p.low_stock_threshold ? "text-warning" : "text-ink dark:text-ink-dark"
                          )}
                        >
                          {p.stock_qty}
                        </span>
                        <button
                          onClick={() => adjustStock(p, 1)}
                          aria-label={`Sumar stock a ${p.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:hover:bg-white/5"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                          aria-label={`Editar ${p.name}`}
                          className="rounded-lg p-2 text-ink-muted hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <IconEdit width={16} height={16} />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          aria-label={`Eliminar ${p.name}`}
                          className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/10"
                        >
                          <IconTrash width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        product={editing}
        categories={categories}
      />

      <ImportExcelModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar producto"
        description={`¿Seguro que quieres eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
