"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, FieldWrapper } from "@/components/ui/Field";
import type { InventoryProduct } from "@/lib/types";

export interface ProductFormValues {
  name: string;
  brand: string;
  category: string;
  detail: string;
  sale_price: string;
  stock_qty: string;
  low_stock_threshold: string;
}

const EMPTY: ProductFormValues = {
  name: "",
  brand: "",
  category: "",
  detail: "",
  sale_price: "",
  stock_qty: "0",
  low_stock_threshold: "5",
};

export function ProductForm({
  open,
  onClose,
  onSubmit,
  product,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  product?: InventoryProduct | null;
  categories: string[];
}) {
  const [values, setValues] = useState<ProductFormValues>(
    product
      ? {
          name: product.name,
          brand: product.brand ?? "",
          category: product.category,
          detail: product.detail ?? "",
          sale_price: (product.sale_price_cents / 100).toString(),
          stock_qty: product.stock_qty.toString(),
          low_stock_threshold: product.low_stock_threshold.toString(),
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(values);
      if (!product) setValues(EMPTY);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Editar producto" : "Agregar producto"}
      description={product ? "Actualiza los datos del producto." : "Añade un producto a tu inventario."}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrapper label="Nombre / código" htmlFor="name" error={error} required>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="BS960"
              error={!!error}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Marca" htmlFor="brand">
            <Input
              id="brand"
              value={values.brand}
              onChange={(e) => update("brand", e.target.value)}
              placeholder="Blue Scenery"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Categoría" htmlFor="category" hint="Ej. Audífonos, Cargadores, Pantallas…">
          <Input
            id="category"
            list="category-suggestions"
            value={values.category}
            onChange={(e) => update("category", e.target.value)}
            placeholder="Audífonos"
          />
          <datalist id="category-suggestions">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FieldWrapper>

        <FieldWrapper label="Detalle" htmlFor="detail" hint="Especificaciones cortas: color, conexión, presentación…">
          <Input
            id="detail"
            value={values.detail}
            onChange={(e) => update("detail", e.target.value)}
            placeholder="Balaca · Bluetooth · Blanco"
          />
        </FieldWrapper>

        <div className="grid grid-cols-3 gap-3">
          <FieldWrapper label="Precio de venta" htmlFor="sale_price">
            <Input
              id="sale_price"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={values.sale_price}
              onChange={(e) => update("sale_price", e.target.value)}
              placeholder="14000"
            />
          </FieldWrapper>
          <FieldWrapper label="Stock inicial" htmlFor="stock_qty">
            <Input
              id="stock_qty"
              type="number"
              min="0"
              step="1"
              value={values.stock_qty}
              onChange={(e) => update("stock_qty", e.target.value)}
            />
          </FieldWrapper>
          <FieldWrapper label="Alerta si stock ≤" htmlFor="low_stock_threshold">
            <Input
              id="low_stock_threshold"
              type="number"
              min="0"
              step="1"
              value={values.low_stock_threshold}
              onChange={(e) => update("low_stock_threshold", e.target.value)}
            />
          </FieldWrapper>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {product ? "Guardar cambios" : "Agregar producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
