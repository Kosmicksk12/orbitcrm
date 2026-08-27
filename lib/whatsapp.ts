import type { SupabaseClient } from "@supabase/supabase-js";

export type WhatsAppContext = "orden" | "garantia" | "manual";

/** Texto que se prellena al escribirle a un cliente por una orden. */
export function orderWhatsAppMessage(o: {
  client_name: string;
  order_number: string;
  device_brand: string | null;
  device_model: string | null;
}) {
  const device = [o.device_brand, o.device_model].filter(Boolean).join(" ");
  return `Hola ${o.client_name}, te escribo por tu orden ${o.order_number}${
    device ? ` (${device})` : ""
  }.`;
}

/** Texto que se prellena al enviar el comprobante de garantía. */
export function warrantyWhatsAppMessage(
  o: { client_name: string; device_brand: string | null; device_model: string | null },
  publicLink: string
) {
  const device = [o.device_brand, o.device_model].filter(Boolean).join(" ") || "—";
  return `Hola ${o.client_name}, aquí está el comprobante de garantía de tu equipo (${device}): ${publicLink}`;
}

/**
 * Registra en la base que se abrió WhatsApp con un mensaje. Es "fire and
 * forget": se llama desde el onClick del enlace, no bloquea la apertura de
 * WhatsApp (que va en pestaña nueva) y si falla no se le muestra error al
 * usuario — el historial es un extra, no debe romper el flujo de trabajo.
 */
export async function logWhatsAppMessage(
  supabase: SupabaseClient,
  payload: {
    shopId: string;
    orderId?: string | null;
    orderNumber?: string | null;
    clientName: string;
    clientPhone: string;
    message: string;
    context: WhatsAppContext;
  }
) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("whatsapp_messages").insert({
      owner_id: session.user.id,
      shop_id: payload.shopId,
      order_id: payload.orderId ?? null,
      order_number: payload.orderNumber ?? null,
      client_name: payload.clientName,
      client_phone: payload.clientPhone,
      message: payload.message,
      context: payload.context,
    });
  } catch {
    // Silencioso a propósito.
  }
}
