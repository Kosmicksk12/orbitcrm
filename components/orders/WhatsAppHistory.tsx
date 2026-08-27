"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconWhatsapp } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Primitives";
import { formatDateTime } from "@/lib/utils";
import type { WhatsAppMessage } from "@/lib/types";

const CONTEXT_LABEL: Record<WhatsAppMessage["context"], string> = {
  orden: "Orden",
  garantia: "Garantía",
  manual: "Manual",
};

/**
 * Lista de mensajes de WhatsApp registrados. Se filtra por orden (detalle de
 * una orden) o por teléfono del cliente (ficha de cliente) — pasar exactamente
 * uno de los dos.
 */
export function WhatsAppHistory({
  orderId,
  clientPhone,
}: {
  orderId?: string;
  clientPhone?: string;
}) {
  const [messages, setMessages] = useState<WhatsAppMessage[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMessages(null);
      setError(false);
      const supabase = createClient();
      const base = supabase.from("whatsapp_messages").select("*");
      const filtered = orderId
        ? base.eq("order_id", orderId)
        : base.eq("client_phone", clientPhone ?? "");
      const { data, error: err } = await filtered.order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) setError(true);
      else setMessages((data ?? []) as WhatsAppMessage[]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, clientPhone]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-semibold text-ink dark:text-ink-dark">Historial de WhatsApp</p>
        {messages && messages.length > 0 && (
          <span className="font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
            {messages.length}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
          No pudimos cargar el historial.
        </p>
      ) : messages === null ? (
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted">Cargando…</p>
      ) : messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
          Todavía no se ha enviado ningún WhatsApp {orderId ? "por esta orden" : "a este cliente"}.
        </p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className="rounded-xl border border-line p-3 dark:border-line-dark">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent dark:bg-accent/15">
                  <IconWhatsapp width={13} height={13} />
                </span>
                <Badge tone={m.context === "garantia" ? "accent" : "neutral"} dot={false}>
                  {CONTEXT_LABEL[m.context]}
                </Badge>
                {!orderId && m.order_number && (
                  <span className="font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
                    {m.order_number}
                  </span>
                )}
                <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
                  · {formatDateTime(m.created_at)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink dark:text-ink-dark">
                {m.message}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
        Se registra cada vez que abres WhatsApp desde el sistema. No confirma que el cliente lo
        haya recibido ni leído.
      </p>
    </div>
  );
}
