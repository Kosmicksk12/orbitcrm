"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FieldWrapper } from "@/components/ui/Field";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";

export interface ExpenseFormValues {
  category: string;
  description: string;
  amount: string;
  expense_date: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: ExpenseFormValues = {
  category: "Repuestos",
  description: "",
  amount: "",
  expense_date: today(),
};

export function ExpenseForm({
  open,
  onClose,
  onSubmit,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  expense?: Expense | null;
}) {
  const [values, setValues] = useState<ExpenseFormValues>(
    expense
      ? {
          category: expense.category,
          description: expense.description,
          amount: (expense.amount_cents / 100).toString(),
          expense_date: expense.expense_date,
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.description.trim()) {
      setError("Describe brevemente en qué se gastó.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(values);
      if (!expense) setValues(EMPTY);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? "Editar gasto" : "Nuevo gasto"}
      description={expense ? "Actualiza los datos del gasto." : "Registra una compra o gasto del negocio."}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FieldWrapper label="Descripción" htmlFor="description" error={error} required>
          <Input
            id="description"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Compra de repuestos a proveedor X"
            error={!!error}
            required
          />
        </FieldWrapper>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Categoría" htmlFor="category">
            <Select id="category" value={values.category} onChange={(e) => update("category", e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Monto" htmlFor="amount">
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={values.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="50000"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Fecha" htmlFor="expense_date">
          <Input
            id="expense_date"
            type="date"
            value={values.expense_date}
            onChange={(e) => update("expense_date", e.target.value)}
          />
        </FieldWrapper>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {expense ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
