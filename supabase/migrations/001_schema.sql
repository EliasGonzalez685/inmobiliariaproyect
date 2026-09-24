-- INMOBILIARIAPROYECT — esquema inicial
-- Roles: super_admin (dueño del sistema / mantenimiento) y usuario (personal del cliente, máx. 2)

create extension if not exists pgcrypto;

-- ───────────────────────── Tipos ─────────────────────────
create type public.rol_usuario as enum ('super_admin', 'usuario');
create type public.tipo_cliente as enum ('propietario', 'inquilino', 'comprador', 'otro');
create type public.tipo_propiedad as enum ('casa', 'departamento', 'terreno', 'local', 'oficina', 'deposito', 'quinta', 'otro');
create type public.estado_propiedad as enum ('disponible', 'reservada', 'ocupada', 'alquilada', 'vendida', 'en_mantenimiento');
create type public.operacion_propiedad as enum ('venta', 'alquiler', 'administracion');
create type public.moneda as enum ('PYG', 'USD');
create type public.categoria_foto as enum ('estado_general', 'estructura', 'acabados', 'instalaciones', 'antes', 'despues', 'ocupacion_inicio', 'ocupacion_final', 'deterioro', 'otro');
create type public.tipo_documento as enum ('escritura', 'titulo', 'plano', 'impuesto', 'contrato', 'habilitacion', 'seguro', 'servicio', 'otro');
create type public.tipo_mantenimiento as enum ('preventivo', 'correctivo', 'mejora');
create type public.estado_mantenimiento as enum ('pendiente', 'en_proceso', 'completado');
create type public.tipo_vencimiento as enum ('impuesto', 'titulo', 'seguro', 'inspeccion', 'contrato', 'servicio', 'otro');
create type public.estado_vencimiento as enum ('pendiente', 'cumplido');

-- ───────────────────────── Perfiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  rol public.rol_usuario not null default 'usuario',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Funciones auxiliares en un esquema no expuesto por la API
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.es_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.activo
  );
$$;

create or replace function private.es_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.activo and p.rol = 'super_admin'
  );
$$;

revoke all on function private.es_staff() from public, anon;
revoke all on function private.es_super_admin() from public, anon;
grant execute on function private.es_staff() to authenticated;
grant execute on function private.es_super_admin() to authenticated;

-- Crea el perfil automáticamente al registrar un usuario en auth.users
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- updated_at automático
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── Clientes ─────────────────────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_cliente not null default 'propietario',
  nombre text not null,
  documento text,               -- C.I. o RUC
  telefono text,
  email text,
  direccion text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clientes_updated_at before update on public.clientes
  for each row execute function private.set_updated_at();

-- ───────────────────────── Propiedades ─────────────────────────
create table public.propiedades (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  titulo text not null,
  tipo public.tipo_propiedad not null default 'casa',
  estado public.estado_propiedad not null default 'disponible',
  operacion public.operacion_propiedad not null default 'administracion',
  cliente_id uuid references public.clientes(id) on delete set null,

  -- Ubicación
  direccion text,
  barrio text,
  ciudad text,
  departamento text,
  latitud double precision,
  longitud double precision,

  -- Datos técnicos
  superficie_terreno numeric(12,2),      -- m²
  superficie_construida numeric(12,2),   -- m²
  medidas text,                          -- frente x fondo, etc.
  linderos text,
  dormitorios int,
  banos int,
  cocheras int,
  anio_construccion int,
  servicios text[] not null default '{}',  -- agua, luz, cloacas, internet...
  mejoras text,

  -- Datos legales
  finca_nro text,
  padron_nro text,
  matricula text,
  cuenta_corriente_catastral text,
  normativas text,

  -- Valores
  precio numeric(16,2),
  moneda public.moneda not null default 'PYG',

  notas text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index propiedades_cliente_idx on public.propiedades(cliente_id);
create index propiedades_estado_idx on public.propiedades(estado);
create trigger propiedades_updated_at before update on public.propiedades
  for each row execute function private.set_updated_at();

-- ───────────────────────── Fotos ─────────────────────────
create table public.propiedad_fotos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.propiedades(id) on delete cascade,
  storage_path text not null,
  descripcion text,
  categoria public.categoria_foto not null default 'estado_general',
  fecha_toma date not null default current_date,
  es_portada boolean not null default false,
  subido_por uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index fotos_propiedad_idx on public.propiedad_fotos(propiedad_id, fecha_toma);

-- ───────────────────────── Documentos ─────────────────────────
create table public.propiedad_documentos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.propiedades(id) on delete cascade,
  tipo public.tipo_documento not null default 'otro',
  nombre text not null,
  storage_path text not null,
  fecha_emision date,
  fecha_vencimiento date,
  notas text,
  subido_por uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index documentos_propiedad_idx on public.propiedad_documentos(propiedad_id);

-- ───────────────────────── Mantenimiento ─────────────────────────
create table public.mantenimientos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.propiedades(id) on delete cascade,
  titulo text not null,
  descripcion text,
  tipo public.tipo_mantenimiento not null default 'correctivo',
  estado public.estado_mantenimiento not null default 'pendiente',
  fecha date not null default current_date,
  costo numeric(16,2),
  moneda public.moneda not null default 'PYG',
  responsable text,
  resultado text,
  registrado_por uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mantenimientos_propiedad_idx on public.mantenimientos(propiedad_id, fecha desc);
create trigger mantenimientos_updated_at before update on public.mantenimientos
  for each row execute function private.set_updated_at();

-- ───────────────────────── Vencimientos ─────────────────────────
create table public.vencimientos (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.propiedades(id) on delete cascade,
  tipo public.tipo_vencimiento not null default 'otro',
  descripcion text not null,
  fecha_vencimiento date not null,
  monto numeric(16,2),
  moneda public.moneda not null default 'PYG',
  estado public.estado_vencimiento not null default 'pendiente',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vencimientos_fecha_idx on public.vencimientos(fecha_vencimiento) where estado = 'pendiente';
create index vencimientos_propiedad_idx on public.vencimientos(propiedad_id);
create trigger vencimientos_updated_at before update on public.vencimientos
  for each row execute function private.set_updated_at();

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.propiedades enable row level security;
alter table public.propiedad_fotos enable row level security;
alter table public.propiedad_documentos enable row level security;
alter table public.mantenimientos enable row level security;
alter table public.vencimientos enable row level security;

-- profiles: cada quien ve el suyo; el super admin ve y gestiona todos
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.es_super_admin()));
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using ((select private.es_super_admin()))
  with check ((select private.es_super_admin()));
create policy "profiles_delete_admin" on public.profiles for delete to authenticated
  using ((select private.es_super_admin()));

-- Tablas de negocio: todo el personal activo tiene acceso completo
do $$
declare t text;
begin
  foreach t in array array['clientes','propiedades','propiedad_fotos','propiedad_documentos','mantenimientos','vencimientos']
  loop
    execute format('create policy "%1$s_staff_all" on public.%1$I for all to authenticated using ((select private.es_staff())) with check ((select private.es_staff()))', t);
  end loop;
end $$;

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('fotos', 'fotos', false, 15728640),           -- 15 MB
  ('documentos', 'documentos', false, 26214400)  -- 25 MB
on conflict (id) do nothing;

create policy "staff_fotos_all" on storage.objects for all to authenticated
  using (bucket_id = 'fotos' and (select private.es_staff()))
  with check (bucket_id = 'fotos' and (select private.es_staff()));

create policy "staff_documentos_all" on storage.objects for all to authenticated
  using (bucket_id = 'documentos' and (select private.es_staff()))
  with check (bucket_id = 'documentos' and (select private.es_staff()));

-- ───────────────────────── Vista del dashboard ─────────────────────────
create or replace view public.resumen_patrimonio
with (security_invoker = true) as
select
  count(*)::int as total,
  count(*) filter (where estado = 'disponible')::int as disponibles,
  count(*) filter (where estado in ('ocupada','alquilada'))::int as ocupadas,
  count(*) filter (where estado = 'en_mantenimiento')::int as en_mantenimiento,
  count(*) filter (where estado = 'vendida')::int as vendidas,
  coalesce(sum(superficie_terreno), 0) as m2_terreno,
  coalesce(sum(superficie_construida), 0) as m2_construidos
from public.propiedades;
