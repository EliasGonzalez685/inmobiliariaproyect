-- Multiempresa: el sistema pasa a alojar a varias inmobiliarias (empresas) en la misma base,
-- totalmente separadas entre sí. Nadie del personal ve ni sabe que existen otras empresas:
-- la separación es invisible, solo el super administrador la gestiona desde Soporte.
--
-- Reglas:
--  · Cada cuenta de personal ('usuario') pertenece a una sola empresa (profiles.empresa_id).
--  · Cada fila de datos de negocio (propiedades, clientes, operaciones, fotos, documentos,
--    mantenimientos, vencimientos) pertenece a una empresa; se completa sola al guardar
--    (default = la empresa de quien está guardando), así el código de la app no cambia.
--  · Las políticas de RLS exigen, además de es_staff(), que la fila sea de la empresa de quien
--    consulta. Si la empresa se desactiva, sus cuentas dejan de ver datos al instante.
--  · El super administrador sigue sin acceso a datos de negocio; solo crea empresas y cuentas.
--
-- Nota técnica: esta migración se aplicó a mano, en varias sentencias sueltas, porque
-- DROP POLICY / DROP FUNCTION se quedan esperando una confirmación que esta herramienta
-- nunca recibe en este entorno. Por eso se usa ALTER POLICY (modifica sin borrar) y se crea
-- una función nueva (soporte_listar_personal) en vez de reemplazar soporte_listar_usuarios.

-- ───────────────────────── Empresas ─────────────────────────
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
-- Sin políticas: nadie accede directo por la API; solo a través de las funciones soporte_* (security definer).
alter table public.empresas enable row level security;

alter table public.profiles
  add column empresa_id uuid references public.empresas(id);

-- Empresa de quien está conectado: null si no es personal activo, si no tiene empresa asignada,
-- o si su empresa está desactivada (con esto alcanza para bloquear el acceso al instante).
create or replace function private.mi_empresa()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.empresa_id
  from public.profiles p
  join public.empresas e on e.id = p.empresa_id and e.activo
  where p.id = (select auth.uid()) and p.activo and p.rol = 'usuario';
$$;

revoke all on function private.mi_empresa() from public, anon;
grant execute on function private.mi_empresa() to authenticated;

-- ───────────────────────── Empresa 1: todo lo que ya existía pasa a ser la primera empresa ─────────────────────────
do $$
declare v_empresa uuid; t text;
begin
  insert into public.empresas (nombre) values ('Empresa 1') returning id into v_empresa;
  update public.profiles set empresa_id = v_empresa where rol = 'usuario';

  foreach t in array array['clientes','propiedades','propiedad_fotos','propiedad_documentos','mantenimientos','vencimientos','operaciones']
  loop
    execute format('alter table public.%1$I add column empresa_id uuid references public.empresas(id)', t);
    execute format('update public.%1$I set empresa_id = %2$L', t, v_empresa);
    execute format('alter table public.%1$I alter column empresa_id set not null', t);
    execute format('alter table public.%1$I alter column empresa_id set default private.mi_empresa()', t);
    execute format('create index %1$s_empresa_idx on public.%1$I(empresa_id)', t);
  end loop;
end $$;

-- ───────────────────────── RLS: reemplaza "todo el personal activo" por "todo el personal de SU empresa" ─────────────────────────
-- (se modifica cada política existente en el lugar, sin DROP)
alter policy "clientes_staff_all" on public.clientes
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

alter policy "propiedades_staff_all" on public.propiedades
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

alter policy "propiedad_fotos_staff_all" on public.propiedad_fotos
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

alter policy "propiedad_documentos_staff_all" on public.propiedad_documentos
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

alter policy "mantenimientos_staff_all" on public.mantenimientos
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

alter policy "vencimientos_staff_all" on public.vencimientos
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

alter policy "operaciones_staff_all" on public.operaciones
  using ((select private.es_staff()) and empresa_id = (select private.mi_empresa()))
  with check ((select private.es_staff()) and empresa_id = (select private.mi_empresa()));

-- ───────────────────────── Storage: fotos y documentos se guardan en "<id de la propiedad>/archivo" ─────────────────────────
alter policy "staff_fotos_all" on storage.objects
  using (
    bucket_id = 'fotos' and (select private.es_staff())
    and exists (select 1 from public.propiedades p where p.id::text = (storage.foldername(name))[1] and p.empresa_id = (select private.mi_empresa()))
  )
  with check (
    bucket_id = 'fotos' and (select private.es_staff())
    and exists (select 1 from public.propiedades p where p.id::text = (storage.foldername(name))[1] and p.empresa_id = (select private.mi_empresa()))
  );

alter policy "staff_documentos_all" on storage.objects
  using (
    bucket_id = 'documentos' and (select private.es_staff())
    and exists (select 1 from public.propiedades p where p.id::text = (storage.foldername(name))[1] and p.empresa_id = (select private.mi_empresa()))
  )
  with check (
    bucket_id = 'documentos' and (select private.es_staff())
    and exists (select 1 from public.propiedades p where p.id::text = (storage.foldername(name))[1] and p.empresa_id = (select private.mi_empresa()))
  );

-- ───────────────────────── Soporte: empresas ─────────────────────────
create or replace function public.soporte_listar_empresas()
returns table (id uuid, nombre text, activo boolean, creado timestamptz, cantidad_usuarios int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select e.id, e.nombre, e.activo, e.created_at,
           (select count(*)::int from public.profiles p where p.empresa_id = e.id and p.rol = 'usuario')
    from public.empresas e
    order by e.created_at;
end;
$$;

create or replace function public.soporte_crear_empresa(p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_nombre text := btrim(p_nombre);
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_nombre is null or length(v_nombre) < 2 then
    raise exception 'El nombre de la empresa es muy corto';
  end if;
  insert into public.empresas (nombre) values (v_nombre) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.soporte_cambiar_estado_empresa(p_id uuid, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.empresas set activo = p_activo where id = p_id;
  if not found then raise exception 'Empresa no válida'; end if;
  if not p_activo then
    delete from auth.sessions where user_id in (select id from public.profiles where empresa_id = p_id);
  end if;
end;
$$;

-- ───────────────────────── Soporte: completar una cuenta recién creada (el correo/clave ya se crearon con permisos de administrador) ─────────────────────────
create or replace function public.soporte_completar_cuenta(p_id uuid, p_empresa_id uuid, p_nombre text, p_email_contacto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not exists (select 1 from public.empresas where id = p_empresa_id and activo) then
    raise exception 'Empresa no válida';
  end if;
  if not exists (select 1 from public.profiles where id = p_id and rol = 'usuario' and usuario is not null) then
    raise exception 'Cuenta no válida';
  end if;
  update public.profiles
  set empresa_id = p_empresa_id,
      nombre = nullif(btrim(p_nombre), ''),
      email_contacto = nullif(lower(btrim(p_email_contacto)), ''),
      activo = true,
      debe_cambiar_clave = true
  where id = p_id;
end;
$$;

-- soporte_listar_usuarios() queda igual (sin empresa_id, no se usa más); esta es la que usa la app ahora.
create or replace function public.soporte_listar_personal()
returns table (
  id uuid, usuario text, nombre text, email_contacto text,
  activo boolean, debe_cambiar_clave boolean, ultimo_acceso timestamptz, creado timestamptz,
  bloqueado_hasta timestamptz, empresa_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select p.id, p.usuario, p.nombre, p.email_contacto, p.activo, p.debe_cambiar_clave,
           u.last_sign_in_at, p.created_at,
           (select i.bloqueado_hasta from private.intentos_login i where i.clave = p.email and i.bloqueado_hasta > now()),
           p.empresa_id
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.rol = 'usuario'
    order by p.created_at;
end;
$$;

revoke all on function public.soporte_listar_empresas() from public, anon;
revoke all on function public.soporte_crear_empresa(text) from public, anon;
revoke all on function public.soporte_cambiar_estado_empresa(uuid, boolean) from public, anon;
revoke all on function public.soporte_completar_cuenta(uuid, uuid, text, text) from public, anon;
revoke all on function public.soporte_listar_personal() from public, anon;
grant execute on function public.soporte_listar_empresas() to authenticated;
grant execute on function public.soporte_crear_empresa(text) to authenticated;
grant execute on function public.soporte_cambiar_estado_empresa(uuid, boolean) to authenticated;
grant execute on function public.soporte_completar_cuenta(uuid, uuid, text, text) to authenticated;
grant execute on function public.soporte_listar_personal() to authenticated;
