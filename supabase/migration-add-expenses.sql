-- ============================================================================
-- Migración: módulo de Gastos/Compras del local (repuestos al por mayor,
-- insumos, arriendo, servicios, etc.). Corre esto completo en el SQL Editor.
-- ============================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  category text not null default 'General',
  description text not null,
  amount_cents bigint not null default 0,
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_shop_id_idx on public.expenses (shop_id);
create index if not exists expenses_date_idx on public.expenses (shop_id, expense_date);

alter table public.expenses enable row level security;

drop policy if exists "Expenses: shop members select" on public.expenses;
create policy "Expenses: shop members select" on public.expenses
  for select using (shop_id in (select public.user_shop_ids()));
drop policy if exists "Expenses: shop members insert" on public.expenses;
create policy "Expenses: shop members insert" on public.expenses
  for insert with check (shop_id in (select public.user_shop_ids()));
drop policy if exists "Expenses: shop members update" on public.expenses;
create policy "Expenses: shop members update" on public.expenses
  for update using (shop_id in (select public.user_shop_ids()));
drop policy if exists "Expenses: only admins delete" on public.expenses;
create policy "Expenses: only admins delete" on public.expenses
  for delete using (public.is_shop_admin(shop_id));

drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute procedure public.set_updated_at();
