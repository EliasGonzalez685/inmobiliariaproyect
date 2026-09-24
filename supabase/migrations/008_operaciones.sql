-- Control de operaciones (ventas, alquileres, reservas…) en reemplazo de los vencimientos.
-- Las tablas de vencimientos se conservan en la base pero ya no se usan en la aplicación.
create type public.tipo_operacion as enum ('venta', 'alquiler', 'reserva', 'otro');
create type public.estado_operacion as enum ('concretada', 'en_curso', 'cancelada');

create table public.operaciones (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid references public.propiedades(id) on delete set null,
  propiedad_titulo text,                 -- copia del título: el historial se conserva aunque se elimine la propiedad
  tipo public.tipo_operacion not null default 'venta',
  tipo_otro text,
  estado public.estado_operacion not null default 'concretada',
  fecha date not null default current_date,
  monto numeric(16,2),
  moneda public.moneda not null default 'PYG',
  comision numeric(16,2),
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nombre text,                   -- copia del nombre (comprador / inquilino)
  fecha_inicio date,                     -- alquileres: vigencia del contrato
  fecha_fin date,
  forma_pago text,
  notas text,
  registrado_por uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operaciones_monto_positivo check (monto is null or monto >= 0),
  constraint operaciones_comision_positiva check (comision is null or comision >= 0),
  constraint operaciones_vigencia check (fecha_inicio is null or fecha_fin is null or fecha_fin >= fecha_inicio),
  constraint operaciones_tipo_otro_largo check (tipo_otro is null or char_length(tipo_otro) <= 60)
);
create index operaciones_fecha_idx on public.operaciones(fecha desc);
create index operaciones_propiedad_idx on public.operaciones(propiedad_id);
create index operaciones_cliente_idx on public.operaciones(cliente_id);
create index operaciones_registrado_por_idx on public.operaciones(registrado_por);
create trigger operaciones_updated_at before update on public.operaciones
  for each row execute function private.set_updated_at();

alter table public.operaciones enable row level security;
create policy "operaciones_staff_all" on public.operaciones for all to authenticated
  using ((select private.es_staff())) with check ((select private.es_staff()));
