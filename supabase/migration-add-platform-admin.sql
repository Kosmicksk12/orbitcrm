-- ============================================================================
-- Migración: Panel de super-admin. Crea la noción de "platform admin" (los
-- dueños del SaaS) y funciones SECURITY DEFINER para ver TODOS los talleres
-- por encima de RLS — siempre chequeando primero que quien llama sea platform
-- admin.
--
-- Corre esto completo en el SQL Editor de Supabase, una sola vez.
-- ============================================================================

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Cada quien puede ver solo su propia fila (para que la app sepa si mostrar
-- el panel). Nadie puede insertarse/borrarse a sí mismo: eso se hace a mano
-- desde el SQL Editor.
drop policy if exists "Platform admins: self-visible" on public.platform_admins;
create policy "Platform admins: self-visible" on public.platform_admins
  for select using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_shops: una fila por taller, con métricas. Solo platform admins.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_shops()
returns table (
  shop_id uuid,
  shop_name text,
  created_at timestamptz,
  subscription_status text,
  trial_ends_at timestamptz,
  member_count bigint,
  order_count bigint,
  sale_count bigint,
  owner_email text,
  last_order_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select
    s.id,
    s.name,
    s.created_at,
    s.subscription_status,
    s.trial_ends_at,
    (select count(*) from public.shop_members m where m.shop_id = s.id),
    (select count(*) from public.service_orders o where o.shop_id = s.id and o.deleted_at is null),
    (select count(*) from public.sales sa where sa.shop_id = s.id),
    (
      select p.email
      from public.shop_members m
      join public.profiles p on p.id = m.user_id
      where m.shop_id = s.id and m.role = 'admin'
      order by m.created_at
      limit 1
    ),
    (select max(o.created_at) from public.service_orders o where o.shop_id = s.id)
  from public.shops s
  order by s.created_at desc;
end;
$$;

grant execute on function public.admin_list_shops() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_shop_subscription: cambiar a mano el estado de un taller
-- (activar, marcar vencida, extender prueba). Solo platform admins.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_shop_subscription(
  p_shop_id uuid,
  p_status text,
  p_trial_ends_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  if p_status not in ('trialing', 'active', 'past_due', 'canceled') then
    raise exception 'Estado inválido: %', p_status;
  end if;

  update public.shops
    set subscription_status = p_status,
        trial_ends_at = coalesce(p_trial_ends_at, trial_ends_at)
    where id = p_shop_id;
end;
$$;

grant execute on function public.admin_set_shop_subscription(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Sembrar al primer platform admin. Cambia el correo si hace falta, o agrega
-- más filas a mano.
-- ---------------------------------------------------------------------------
insert into public.platform_admins (user_id)
select id from public.profiles where lower(email) = lower('verdixinsta@gmail.com')
on conflict do nothing;
