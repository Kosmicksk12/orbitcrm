-- ============================================================================
-- Migración: Productos solicitados (encargos de clientes que no hay en stock).
-- Corre esto en el SQL Editor de Supabase (una sola vez).
-- ============================================================================

create table if not exists public.requested_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  product_name text not null,
  client_name text,
  notes text,
  status text not null default 'pendiente' check (status in ('pendiente', 'comprado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requested_products_shop_id_idx on public.requested_products (shop_id);
create index if not exists requested_products_status_idx on public.requested_products (shop_id, status);

alter table public.requested_products enable row level security;

create policy "Requested products: shop members can select" on public.requested_products
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Requested products: shop members can insert" on public.requested_products
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Requested products: shop members can update" on public.requested_products
  for update using (shop_id in (select public.user_shop_ids()));
create policy "Requested products: only admins can delete" on public.requested_products
  for delete using (public.is_shop_admin(shop_id));

drop trigger if exists set_updated_at on public.requested_products;
create trigger set_updated_at before update on public.requested_products
  for each row execute procedure public.set_updated_at();
