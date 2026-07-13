export type OrderStatus =
  | "recibido"
  | "diagnostico"
  | "en_reparacion"
  | "listo"
  | "entregado"
  | "pagada";

export interface ServiceOrder {
  id: string;
  owner_id: string;
  order_number: string;
  client_name: string;
  client_phone: string;
  device_brand: string | null;
  device_model: string | null;
  problem_description: string | null;
  technician: string | null;
  status: OrderStatus;
  total_cents: number;
  paid_cents: number;
  cost_cents: number;
  warranty_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A client is not its own table — it's every service_orders row for a given
 * phone number, rolled up. This mirrors how the shop actually thinks about
 * clients: their whole history is just "everything we've ever repaired for
 * them". */
export interface ClientSummary {
  client_name: string;
  client_phone: string;
  total_spent_cents: number;
  balance_cents: number;
  repairs_count: number;
  active_warranties_count: number;
  devices: string[];
  last_visit: string;
  orders: ServiceOrder[];
}

export interface InventoryProduct {
  id: string;
  owner_id: string;
  name: string;
  brand: string | null;
  category: string;
  detail: string | null;
  sale_price_cents: number;
  stock_qty: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "recibido", label: "Recibido" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "en_reparacion", label: "En reparación" },
  { id: "listo", label: "Listo" },
  { id: "entregado", label: "Entregado" },
  { id: "pagada", label: "Pagada" },
];
