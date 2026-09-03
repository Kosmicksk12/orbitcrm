"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, FieldWrapper } from "@/components/ui/Field";
import { PAYMENT_METHODS, type Sale } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

interface EditableLine {
  id: string;
  name: string;
  quantity: number;
  price: string; // pesos, as text for the input
  cost: string; // pesos, as text for the input
}

export interface EditSalePayload {
  clientName: string;
  paymentMethod: string;
  items: { id: string; unit_price_cents: number; unit_cost_cents: number }[];
}

export function EditSaleModal({
  open,
  onClose,
  onSubmit,
  sale,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: EditSalePayload) => Promise<void>;
  sale: Sale | null;
}) {
  const [clientName, setClientName] = useState(sale?.client_name ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(sale?.payment_method ?? "");
  const [lines, setLines] = useState<EditableLine[]>(
    (sale?.sale_items ?? []).map((i) => ({
      id: i.id,
      name: i.product_name,
      quantity: i.quantity,
      price: (i.unit_price_cents / 100).toString(),
      cost: (i.unit_cost_cents / 100).toString(),
    }))
  );
  const [loading, setLoading] = useState(false);

  function updateLine(id: string, field: "price" | "cost", value: string) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  const totalPreview = lines.reduce(
    (sum, l) => sum + Math.round((parseFloat(l.price || "0") || 0) * 100) * l.quantity,
    0
  );
  const profitPreview = lines.reduce((sum, l) => {
    const price = Math.round((parseFloat(l.price || "0") || 0) * 100);
    const cost = Math.round((parseFloat(l.cost || "0") || 0) * 100);
    return sum + (price - cost) * l.quantity;
  }, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        clientName,
        paymentMethod,
        items: lines.map((l) => ({
          id: l.id,
          unit_price_cents: Math.round((parseFloat(l.price || "0") || 0) * 100),
          unit_cost_cents: Math.round((parseFloat(l.cost || "0") || 0) * 100),
        })),
      });
    } finally {
      setLoading(false);
    }
  }

  if (!sale) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar venta"
      description="Corrige el cliente, el precio o el costo de cada ítem. La cantidad no se puede cambiar aquí."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FieldWrapper label="Cliente" htmlFor="edit-client-name">
          <Input
            id="edit-client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nombre del cliente (opcional)"
          />
        </FieldWrapper>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink dark:text-ink-dark">
            Método de pago <span className="font-normal text-ink-muted dark:text-ink-dark-muted">(opcional)</span>
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod((cur) => (cur === m.id ? "" : m.id))}
                aria-pressed={paymentMethod === m.id}
                className={cn(
                  "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                  paymentMethod === m.id
                    ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent/15 dark:text-accent-400"
                    : "border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:text-ink-dark-muted dark:hover:bg-white/5"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.id} className="rounded-xl border border-line p-3 dark:border-line-dark">
              <p className="text-sm font-medium text-ink dark:text-ink-dark">
                {l.quantity}× {l.name}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <FieldWrapper label="Costo" htmlFor={`cost-${l.id}`}>
                  <Input
                    id={`cost-${l.id}`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={l.cost}
                    onChange={(e) => updateLine(l.id, "cost", e.target.value)}
                  />
                </FieldWrapper>
                <FieldWrapper label="Precio de venta" htmlFor={`price-${l.id}`}>
                  <Input
                    id={`price-${l.id}`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={l.price}
                    onChange={(e) => updateLine(l.id, "price", e.target.value)}
                  />
                </FieldWrapper>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-accent-50 p-3 text-sm dark:bg-accent/10">
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">Nuevo total</p>
            <p className="font-mono font-semibold text-ink dark:text-ink-dark">
              {formatCurrency(totalPreview)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-ink-muted dark:text-ink-dark-muted">Ganancia neta</p>
            <p className="font-mono font-semibold text-accent-700 dark:text-accent-400">
              {formatCurrency(profitPreview)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
