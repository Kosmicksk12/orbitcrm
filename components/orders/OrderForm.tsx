"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FieldWrapper } from "@/components/ui/Field";
import { IconPrinter } from "@/components/ui/Icons";
import { ORDER_STATUSES, type OrderStatus, type ServiceOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface OrderFormValues {
  client_name: string;
  client_phone: string;
  device_brand: string;
  device_model: string;
  problem_description: string;
  technician: string;
  status: OrderStatus;
  total: string;
  paid: string;
  cost: string;
  warranty_days: string;
  notes: string;
}

const EMPTY: OrderFormValues = {
  client_name: "",
  client_phone: "",
  device_brand: "",
  device_model: "",
  problem_description: "",
  technician: "",
  status: "recibido",
  total: "",
  paid: "",
  cost: "",
  warranty_days: "90",
  notes: "",
};

export function OrderForm({
  open,
  onClose,
  onSubmit,
  order,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: OrderFormValues) => Promise<void>;
  order?: ServiceOrder | null;
  defaultStatus?: OrderStatus;
}) {
  const [values, setValues] = useState<OrderFormValues>(
    order
      ? {
          client_name: order.client_name,
          client_phone: order.client_phone,
          device_brand: order.device_brand ?? "",
          device_model: order.device_model ?? "",
          problem_description: order.problem_description ?? "",
          technician: order.technician ?? "",
          status: order.status,
          total: (order.total_cents / 100).toString(),
          paid: (order.paid_cents / 100).toString(),
          cost: (order.cost_cents / 100).toString(),
          warranty_days: order.warranty_days.toString(),
          notes: order.notes ?? "",
        }
      : { ...EMPTY, status: defaultStatus ?? "recibido" }
  );
  const [errors, setErrors] = useState<{ client_name?: string; client_phone?: string }>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate() {
    const next: typeof errors = {};
    if (!values.client_name.trim()) next.client_name = "El nombre del cliente es obligatorio.";
    if (!values.client_phone.trim()) next.client_phone = "El teléfono es obligatorio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit(values);
      if (!order) setValues({ ...EMPTY, status: defaultStatus ?? "recibido" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order ? `Editar orden ${order.order_number}` : "Nueva orden de servicio"}
      description={order ? "Actualiza los datos de la reparación." : "Registra un equipo que ingresa al taller."}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Nombre del cliente" htmlFor="client_name" error={errors.client_name} required>
            <Input
              id="client_name"
              value={values.client_name}
              onChange={(e) => update("client_name", e.target.value)}
              placeholder="Ruth Gómez"
              error={!!errors.client_name}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Teléfono" htmlFor="client_phone" error={errors.client_phone} required>
            <Input
              id="client_phone"
              type="tel"
              value={values.client_phone}
              onChange={(e) => update("client_phone", e.target.value)}
              placeholder="3173622401"
              error={!!errors.client_phone}
              required
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Marca" htmlFor="device_brand">
            <Input
              id="device_brand"
              value={values.device_brand}
              onChange={(e) => update("device_brand", e.target.value)}
              placeholder="Tecno"
            />
          </FieldWrapper>
          <FieldWrapper label="Modelo" htmlFor="device_model">
            <Input
              id="device_model"
              value={values.device_model}
              onChange={(e) => update("device_model", e.target.value)}
              placeholder="Camon 20 Pro"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Falla reportada" htmlFor="problem_description">
          <Textarea
            id="problem_description"
            value={values.problem_description}
            onChange={(e) => update("problem_description", e.target.value)}
            placeholder="No carga, pantalla parpadea, etc."
          />
        </FieldWrapper>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Técnico asignado" htmlFor="technician">
            <Input
              id="technician"
              value={values.technician}
              onChange={(e) => update("technician", e.target.value)}
              placeholder="Alex"
            />
          </FieldWrapper>
          <FieldWrapper label="Estado" htmlFor="status">
            <Select id="status" value={values.status} onChange={(e) => update("status", e.target.value as OrderStatus)}>
              {ORDER_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Total cobrado" htmlFor="total">
            <Input
              id="total"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={values.total}
              onChange={(e) => update("total", e.target.value)}
              placeholder="95000"
            />
          </FieldWrapper>
          <FieldWrapper label="Abonado" htmlFor="paid">
            <Input
              id="paid"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={values.paid}
              onChange={(e) => update("paid", e.target.value)}
              placeholder="0"
            />
          </FieldWrapper>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Costo del repuesto" htmlFor="cost" hint="Lo que te costó a ti — no aparece en la garantía del cliente.">
            <Input
              id="cost"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={values.cost}
              onChange={(e) => update("cost", e.target.value)}
              placeholder="40000"
            />
          </FieldWrapper>
          <FieldWrapper label="Garantía (días)" htmlFor="warranty_days">
            <Input
              id="warranty_days"
              type="number"
              min="0"
              step="1"
              value={values.warranty_days}
              onChange={(e) => update("warranty_days", e.target.value)}
            />
          </FieldWrapper>
        </div>

        {(parseFloat(values.total || "0") > 0 || parseFloat(values.cost || "0") > 0) && (
          <div className="flex items-center justify-between rounded-xl bg-success-soft px-4 py-3 text-sm dark:bg-success/10">
            <span className="font-medium text-success">Ganancia neta estimada</span>
            <span className="font-mono font-semibold text-success">
              {formatCurrency(
                Math.round(
                  ((parseFloat(values.total || "0") || 0) - (parseFloat(values.cost || "0") || 0)) * 100
                )
              )}
            </span>
          </div>
        )}

        <FieldWrapper label="Notas internas" htmlFor="notes">
          <Textarea
            id="notes"
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Repuesto pendiente, cliente avisado, etc."
          />
        </FieldWrapper>

        <div className="flex items-center justify-between gap-3 pt-1">
          {order ? (
            <a
              href={`/orders/${order.id}/warranty`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <IconPrinter width={15} height={15} />
              Imprimir garantía
            </a>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {order ? "Guardar cambios" : "Crear orden"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
