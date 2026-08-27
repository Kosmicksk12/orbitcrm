-- ============================================================================
-- Migración: Historial de WhatsApp. Cada vez que alguien abre WhatsApp desde
-- el sistema (desde una orden o desde el comprobante de garantía), se guarda
-- una fila aquí con el mensaje que se prellenó. Es un registro de "qué le
-- escribimos al cliente" — NO confirma que WhatsApp lo haya entregado ni que
-- el cliente lo haya leído.
--
-- La tabla es append-only: no hay policy de UPDATE a propósito. order_id usa
-- ON DELETE SET NULL para que borrar una orden para siempre no borre el
-- historial de comunicación con el cliente (que se sigue viendo en su ficha,
-- agrupado por teléfono). order_number se guarda desnormalizado por lo mismo.
--
-- Corre esto completo en el SQL Editor de Supabase, una sola vez.
-- ============================================================================

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_id uuid references public.service_orders (id) on delete set null,
  order_number text,
  client_name text not null,
  client_phone text not null,
  message text not null,
  context text not null default 'orden' check (context in ('orden', 'garantia', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_shop_id_idx on public.whatsapp_messages (shop_id);
create index if not exists whatsapp_messages_order_id_idx on public.whatsapp_messages (order_id);
create index if not exists whatsapp_messages_client_phone_idx
  on public.whatsapp_messages (shop_id, client_phone);

alter table public.whatsapp_messages enable row level security;

create policy "WhatsApp messages: shop members can select" on public.whatsapp_messages
  for select using (shop_id in (select public.user_shop_ids()));
create policy "WhatsApp messages: shop members can insert" on public.whatsapp_messages
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "WhatsApp messages: only admins can delete" on public.whatsapp_messages
  for delete using (public.is_shop_admin(shop_id));

-- ---------------------------------------------------------------------------
-- Listo. Sin trigger de updated_at ni policy de update: el historial solo
-- crece, nunca se edita.
-- ---------------------------------------------------------------------------
