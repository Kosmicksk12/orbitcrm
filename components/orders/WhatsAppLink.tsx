"use client";

import type { MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconWhatsapp } from "@/components/ui/Icons";
import { buildWhatsAppLink } from "@/lib/utils";
import { logWhatsAppMessage, type WhatsAppContext } from "@/lib/whatsapp";

/**
 * Enlace "Chatear por WhatsApp" que, además de abrir wa.me en una pestaña
 * nueva, deja registrado el mensaje en whatsapp_messages para que quede
 * historial de qué se le escribió al cliente. El registro es fire-and-forget
 * (ver logWhatsAppMessage).
 */
export function WhatsAppLink({
  phone,
  message,
  context,
  shopId,
  orderId = null,
  orderNumber = null,
  clientName,
  className,
  iconSize = 16,
  label,
  onClick,
}: {
  phone: string;
  message: string;
  context: WhatsAppContext;
  shopId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  clientName: string;
  className?: string;
  iconSize?: number;
  label?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={buildWhatsAppLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ?? `Chatear por WhatsApp con ${clientName}`}
      onClick={(e) => {
        onClick?.(e);
        void logWhatsAppMessage(createClient(), {
          shopId,
          orderId,
          orderNumber,
          clientName,
          clientPhone: phone,
          message,
          context,
        });
      }}
      className={className}
    >
      <IconWhatsapp width={iconSize} height={iconSize} />
      {label && <span>{label}</span>}
    </a>
  );
}
