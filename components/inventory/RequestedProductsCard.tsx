"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShop } from "@/components/shop/ShopContext";
import { useToast } from "@/components/ui/Toaster";
import { useWriteGuard } from "@/hooks/useWriteGuard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Card } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconCheck, IconChevronDown, IconPlus, IconTrash } from "@/components/ui/Icons";
import type { RequestedProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RequestedProductsCard() {
  const supabase = createClient();
  const { shopId, isAdmin } = useShop();
  const { toast } = useToast();
  const { readOnly } = useWriteGuard();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RequestedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState("");
  const [clientName, setClientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [deleting, setDeleting] = useState<RequestedProduct | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("requested_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setItems((data ?? []) as RequestedProduct[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = items.filter((i) => i.status === "pendiente");
  const bought = items.filter((i) => i.status === "comprado");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim() || readOnly) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toast({ title: "No se pudo agregar", description: "Sesión no encontrada.", variant: "danger" });
      return;
    }
    const { error } = await supabase.from("requested_products").insert({
      owner_id: user.id,
      shop_id: shopId,
      product_name: productName.trim(),
      client_name: clientName.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "No se pudo agregar", description: error.message, variant: "danger" });
      return;
    }
    setProductName("");
    setClientName("");
    toast({ title: "Producto agregado a la lista", variant: "success" });
    load();
  }

  async function markBought(item: RequestedProduct) {
    if (readOnly) return;
    const { error } = await supabase
      .from("requested_products")
      .update({ status: "comprado" })
      .eq("id", item.id);
    if (error) {
      toast({ title: "No se pudo actualizar", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Marcado como comprado", variant: "success" });
    load();
  }

  async function handleDelete() {
    if (!deleting || readOnly) return;
    const { error } = await supabase.from("requested_products").delete().eq("id", deleting.id);
    if (error) {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "danger" });
      setDeleting(null);
      return;
    }
    toast({ title: "Eliminado", variant: "success" });
    setDeleting(null);
    load();
  }

  return (
    <Card className="mb-4 p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-ink-dark">
            Productos solicitados
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {pending.length} pendiente{pending.length === 1 ? "" : "s"}
              </span>
            )}
          </h2>
          {!open && (
            <p className="mt-1 text-xs text-ink-muted dark:text-ink-dark-muted">
              Productos que preguntan los clientes y no hay en stock.
            </p>
          )}
        </div>
        <IconChevronDown
          width={18}
          height={18}
          className={cn("shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
            Para tenerlos en cuenta al comprar.
          </p>

          <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Producto (ej: pantalla iPhone 11)"
              aria-label="Nombre del producto"
              className="sm:flex-1"
            />
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Cliente (opcional)"
              aria-label="Cliente"
              className="sm:w-48"
            />
            <Button
              type="submit"
              size="md"
              loading={saving}
              disabled={!productName.trim() || readOnly}
            >
              <IconPlus width={16} height={16} />
              Agregar
            </Button>
          </form>

          <div className="mt-4">
            {loading ? (
              <p className="py-4 text-center text-sm text-ink-muted dark:text-ink-dark-muted">Cargando…</p>
            ) : pending.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                No hay productos pendientes.
              </p>
            ) : (
              <ul className="divide-y divide-line dark:divide-line-dark">
                {pending.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-ink-dark">{item.product_name}</p>
                      {item.client_name && (
                        <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{item.client_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly}
                        onClick={() => markBought(item)}
                      >
                        <IconCheck width={14} height={14} />
                        Ya lo compré
                      </Button>
                      <button
                        onClick={() => setDeleting(item)}
                        aria-label={`Eliminar ${item.product_name}`}
                        disabled={!isAdmin || readOnly}
                        className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/10 disabled:hidden"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {bought.length > 0 && (
            <div className="mt-4 border-t border-line pt-3 dark:border-line-dark">
              <button
                onClick={() => setShowBought((v) => !v)}
                className="text-xs font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark"
              >
                {showBought ? "Ocultar comprados" : `Ver comprados (${bought.length})`}
              </button>
              {showBought && (
                <ul className={cn("mt-2 divide-y divide-line dark:divide-line-dark")}>
                  {bought.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2 opacity-70">
                      <div>
                        <p className="text-sm text-ink dark:text-ink-dark">{item.product_name}</p>
                        {item.client_name && (
                          <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{item.client_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleting(item)}
                        aria-label={`Eliminar ${item.product_name}`}
                        disabled={!isAdmin || readOnly}
                        className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/10 disabled:hidden"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar producto solicitado"
        description={`¿Seguro que quieres eliminar "${deleting?.product_name}" de la lista?`}
        confirmLabel="Eliminar"
      />
    </Card>
  );
}
