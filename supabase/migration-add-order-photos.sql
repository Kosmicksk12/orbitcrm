-- ============================================================================
-- Migración: Fotos del equipo. Evidencia del estado del equipo al recibirlo,
-- como respaldo del taller ante reclamos. SOLO uso interno — no se muestran en
-- el link público de garantía (/garantia/[id]).
--
-- Los archivos van a un bucket PRIVADO de Storage ('order-photos') con la ruta
--   {shop_id}/{order_id}/{uuid}.{ext}
-- Las policies de storage.objects filtran por el primer segmento de la ruta
-- (shop_id), igual que el resto de tablas filtran por taller. Si la ruta viene
-- malformada, el objeto no matchea ninguna policy y queda denegado (fail closed).
-- La tabla order_photos guarda los metadatos (qué archivo es de qué orden).
--
-- Corre esto completo en el SQL Editor de Supabase, una sola vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Bucket privado
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Policies sobre storage.objects para ese bucket.
-- (storage.foldername(name))[1] = shop_id ; se permite solo si el usuario
-- pertenece a ese taller.
-- ---------------------------------------------------------------------------
drop policy if exists "Order photos: shop members can read" on storage.objects;
create policy "Order photos: shop members can read"
on storage.objects for select to authenticated
using (
  bucket_id = 'order-photos'
  and (storage.foldername(name))[1] in (select s::text from public.user_shop_ids() s)
);

drop policy if exists "Order photos: shop members can upload" on storage.objects;
create policy "Order photos: shop members can upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'order-photos'
  and (storage.foldername(name))[1] in (select s::text from public.user_shop_ids() s)
);

drop policy if exists "Order photos: shop members can delete" on storage.objects;
create policy "Order photos: shop members can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'order-photos'
  and (storage.foldername(name))[1] in (select s::text from public.user_shop_ids() s)
);

-- ---------------------------------------------------------------------------
-- Metadatos: qué foto pertenece a qué orden. on delete cascade en order_id:
-- si se borra la orden para siempre, se van los metadatos (los archivos de
-- Storage los limpia la app antes de borrar la orden).
-- ---------------------------------------------------------------------------
create table if not exists public.order_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_id uuid not null references public.service_orders (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists order_photos_order_id_idx on public.order_photos (order_id);
create index if not exists order_photos_shop_id_idx on public.order_photos (shop_id);

alter table public.order_photos enable row level security;

create policy "Order photos meta: shop members can select" on public.order_photos
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Order photos meta: shop members can insert" on public.order_photos
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Order photos meta: shop members can delete" on public.order_photos
  for delete using (shop_id in (select public.user_shop_ids()));

-- ---------------------------------------------------------------------------
-- Listo.
-- ---------------------------------------------------------------------------
