-- Nuevo apartado "Pedidos": lo que pide un cliente (tipo de propiedad, ubicación, medidas, presupuesto),
-- aunque todavía no haya una propiedad cargada que lo cumpla. Se guarda para poder revisarlo más
-- tarde contra las propiedades disponibles.
create type public.estado_pedido as enum ('pendiente', 'en_proceso', 'cumplido', 'cancelado');

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default private.mi_empresa() references public.empresas(id),
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text not null,
  cliente_telefono text,
  tipo public.tipo_propiedad not null default 'casa',
  tipo_otro text,
  ubicacion text,
  medidas text,
  presupuesto numeric(14,2),
  moneda public.moneda not null default 'PYG',
  descripcion text,
  estado public.estado_pedido not null default 'pendiente',
  registrado_por uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedidos_tipo_otro_largo check (tipo_otro is null or char_length(tipo_otro) <= 60)
);
create trigger pedidos_updated_at before update on public.pedidos
  for each row execute function private.set_updated_at();
create index pedidos_empresa_idx on public.pedidos(empresa_id);
create index pedidos_cliente_idx on public.pedidos(cliente_id);

alter table public.pedidos enable row level security;
create policy "pedidos_staff_all" on public.pedidos for all to authenticated
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));
