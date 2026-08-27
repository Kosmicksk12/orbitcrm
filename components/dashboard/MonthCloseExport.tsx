"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { IconDownload } from "@/components/ui/Icons";
import { exportWorkbook } from "@/lib/export";
import type { Expense, Sale, ServiceOrder } from "@/lib/types";

export function MonthCloseExport({ monthKey, monthLabel }: { monthKey: string; monthLabel: string }) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const [{ data: ordersData, error: ordersErr }, { data: salesData, error: salesErr }, { data: expensesData, error: expensesErr }] =
        await Promise.all([
          supabase.from("service_orders").select("*").is("deleted_at", null),
          supabase.from("sales").select("*, sale_items(*)"),
          supabase.from("expenses").select("*").is("deleted_at", null),
        ]);

      if (ordersErr || salesErr || expensesErr) {
        toast({ title: "No se pudo generar el cierre", description: "Intenta de nuevo.", variant: "danger" });
        return;
      }

      const orders = ((ordersData ?? []) as ServiceOrder[]).filter((o) => o.created_at.slice(0, 7) === monthKey);
      const sales = ((salesData ?? []) as Sale[]).filter((s) => s.created_at.slice(0, 7) === monthKey);
      const expenses = ((expensesData ?? []) as Expense[]).filter((e) => e.expense_date.slice(0, 7) === monthKey);

      const repairsSales = orders.reduce((sum, o) => sum + o.total_cents, 0);
      const repairsCost = orders.reduce((sum, o) => sum + o.cost_cents, 0);
      const repairsProfit = repairsSales - repairsCost;

      const accessorySales = sales.reduce((sum, s) => sum + s.total_cents, 0);
      const accessoryCost = sales.reduce(
        (sum, s) => sum + (s.sale_items ?? []).reduce((iSum, i) => iSum + i.unit_cost_cents * i.quantity, 0),
        0
      );
      const accessoryProfit = accessorySales - accessoryCost;

      const expensesTotal = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
      const netProfit = repairsProfit + accessoryProfit - expensesTotal;

      const toPesos = (cents: number) => Math.round(cents) / 100;

      const summaryRows = [
        { Concepto: "Ventas por reparaciones", Valor: toPesos(repairsSales) },
        { Concepto: "Costo de repuestos (reparaciones)", Valor: toPesos(repairsCost) },
        { Concepto: "Ganancia neta reparaciones", Valor: toPesos(repairsProfit) },
        { Concepto: "Ventas de accesorios", Valor: toPesos(accessorySales) },
        { Concepto: "Costo de accesorios vendidos", Valor: toPesos(accessoryCost) },
        { Concepto: "Ganancia neta accesorios", Valor: toPesos(accessoryProfit) },
        { Concepto: "Gastos del mes", Valor: toPesos(expensesTotal) },
        { Concepto: "GANANCIA NETA DEL MES (cierre)", Valor: toPesos(netProfit) },
      ];

      const repairRows = orders.map((o) => ({
        "N.º de orden": o.order_number,
        Cliente: o.client_name,
        Equipo: [o.device_brand, o.device_model].filter(Boolean).join(" ") || "—",
        Total: toPesos(o.total_cents),
        Costo: toPesos(o.cost_cents),
        Ganancia: toPesos(o.total_cents - o.cost_cents),
        Fecha: o.created_at.slice(0, 10),
      }));

      const saleRows = sales.map((s) => {
        const items = s.sale_items ?? [];
        const cost = items.reduce((sum, i) => sum + i.unit_cost_cents * i.quantity, 0);
        return {
          Cliente: s.client_name || "Sin nombre",
          Productos: items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ") || "—",
          Total: toPesos(s.total_cents),
          Costo: toPesos(cost),
          Ganancia: toPesos(s.total_cents - cost),
          Fecha: s.created_at.slice(0, 10),
        };
      });

      const expenseRows = expenses.map((e) => ({
        Categoría: e.category,
        Descripción: e.description,
        Valor: toPesos(e.amount_cents),
        Fecha: e.expense_date,
      }));

      exportWorkbook(`cierre-de-mes-${monthKey}`, [
        { name: "Resumen", rows: summaryRows },
        { name: "Reparaciones", rows: repairRows },
        { name: "Ventas accesorios", rows: saleRows },
        { name: "Gastos", rows: expenseRows },
      ]);

      toast({ title: "Cierre generado", description: monthLabel, variant: "success" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport} loading={loading}>
      <IconDownload width={14} height={14} />
      Cierre de mes (Excel)
    </Button>
  );
}
