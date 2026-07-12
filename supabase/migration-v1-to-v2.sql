-- ============================================================================
-- Migración v1 → v2 para tu proyecto de Supabase YA EXISTENTE.
-- Corre esto una sola vez en el SQL Editor. Reemplaza el modelo genérico de
-- CRM (companies/contacts/deals/activities) por el modelo de taller de
-- reparación (service_orders). No toca tu tabla `profiles` ni tu usuario.
-- ============================================================================

drop table if exists public.activities cascade;
drop table if exists public.deals cascade;
drop table if exists public.contacts cascade;
drop table if exists public.companies cascade;

create sequence if not exists public.service_orders_seq;

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  order_number text not null default (
    'FP-' || lpad(nextval('public.service_orders_seq')::text, 6, '0')
  ),
  client_name text not null,
  client_phone text not null,
  device_brand text,
  device_model text,
  problem_description text,
  technician text,
  status text not null default 'recibido' check (
    status in ('recibido', 'diagnostico', 'en_reparacion', 'listo', 'entregado', 'pagada')
  ),
  total_cents bigint not null default 0,
  paid_cents bigint not null default 0,
  warranty_days integer not null default 90,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_orders_owner_id_idx on public.service_orders (owner_id);
create index if not exists service_orders_status_idx on public.service_orders (status);
create index if not exists service_orders_client_phone_idx on public.service_orders (owner_id, client_phone);

alter table public.service_orders enable row level security;

drop policy if exists "Service orders are owner-scoped select" on public.service_orders;
create policy "Service orders are owner-scoped select" on public.service_orders
  for select using (auth.uid() = owner_id);
drop policy if exists "Service orders are owner-scoped insert" on public.service_orders;
create policy "Service orders are owner-scoped insert" on public.service_orders
  for insert with check (auth.uid() = owner_id);
drop policy if exists "Service orders are owner-scoped update" on public.service_orders;
create policy "Service orders are owner-scoped update" on public.service_orders
  for update using (auth.uid() = owner_id);
drop policy if exists "Service orders are owner-scoped delete" on public.service_orders;
create policy "Service orders are owner-scoped delete" on public.service_orders
  for delete using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.service_orders;
create trigger set_updated_at before update on public.service_orders
  for each row execute procedure public.set_updated_at();

alter table public.profiles add column if not exists shop_name text;
