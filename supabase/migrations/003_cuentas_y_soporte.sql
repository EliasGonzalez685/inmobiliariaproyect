-- INMOBILIARIAPROYECT — cuentas de usuario, ingreso por nombre de usuario y soporte del super administrador
--
-- Reglas:
--  · usuario y correo de contacto son editables por cada persona en "Mi cuenta".
--  · El ingreso acepta usuario, correo de contacto o el correo interno; se resuelve con resolver_login().
--  · El super administrador NO accede a los datos de la inmobiliaria (es_staff = solo rol 'usuario');
--    solo administra cuentas mediante las funciones soporte_*.

-- ───────────────────────── Columnas nuevas ─────────────────────────
alter table public.profiles
  add column usuario text,
  add column email_contacto text,
  add column debe_cambiar_clave boolean not null default false;

alter table public.profiles
  add constraint profiles_usuario_formato
    check (usuario is null or usuario ~ '^[a-z0-9._-]{3,30}$'),
  add constraint profiles_email_contacto_formato
    check (email_contacto is null or (
      email_contacto ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and email_contacto = lower(email_contacto)
      and email_contacto !~ '@inmobiliariaproyect\.app$'
    ));

create unique index profiles_usuario_uidx on public.profiles (usuario) where usuario is not null;
create unique index profiles_email_contacto_uidx on public.profiles (email_contacto) where email_contacto is not null;

-- Usuario inicial = parte local del correo interno
update public.profiles
set usuario = split_part(email, '@', 1)
where usuario is null and split_part(email, '@', 1) ~ '^[a-z0-9._-]{3,30}$';

-- ───────────────────────── Aislamiento del super administrador ─────────────────────────
-- El personal operativo (rol 'usuario') es el único con acceso a propiedades, clientes, fotos y documentos.
create or replace function private.es_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.activo and p.rol = 'usuario'
  );
$$;

-- Perfil automático al crear un usuario en auth.users (inactivo hasta que el super admin lo active)
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local text := lower(split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, nombre, usuario, activo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombre', v_local),
    case when v_local ~ '^[a-z0-9._-]{3,30}$' then v_local end,
    false
  );
  return new;
end;
$$;

-- ───────────────────────── Permisos sobre profiles ─────────────────────────
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and activo)
  with check (id = (select auth.uid()));

-- Cada persona solo puede modificar estos campos de su propio perfil; rol/activo/email nunca.
revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant update (nombre, usuario, email_contacto, debe_cambiar_clave) on public.profiles to authenticated;

-- ───────────────────────── Ingreso por usuario / correo ─────────────────────────
-- Devuelve el correo interno de Auth que corresponde a lo que la persona escribió en el login.
create or replace function public.resolver_login(p_identificador text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select lower(btrim(p_identificador)) as x)
  select p.email
  from public.profiles p, q
  where p.email is not null
    and (p.usuario = q.x or p.email_contacto = q.x or lower(p.email) = q.x)
  order by case when p.usuario = q.x then 0 when p.email_contacto = q.x then 1 else 2 end
  limit 1;
$$;

revoke all on function public.resolver_login(text) from public;
grant execute on function public.resolver_login(text) to anon, authenticated;

-- ───────────────────────── Soporte (solo super administrador) ─────────────────────────
create or replace function public.soporte_listar_usuarios()
returns table (
  id uuid, usuario text, nombre text, email_contacto text,
  activo boolean, debe_cambiar_clave boolean, ultimo_acceso timestamptz, creado timestamptz
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
           u.last_sign_in_at, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.rol = 'usuario'
    order by p.created_at;
end;
$$;

create or replace function public.soporte_cambiar_estado(p_id uuid, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.profiles set activo = p_activo where id = p_id and rol = 'usuario';
  if not found then raise exception 'Usuario no válido'; end if;
  if not p_activo then
    delete from auth.sessions where user_id = p_id;   -- cierra sus sesiones abiertas
  end if;
end;
$$;

create or replace function public.soporte_restablecer_clave(p_id uuid, p_clave text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_clave is null or length(p_clave) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  if not exists (select 1 from public.profiles where id = p_id and rol = 'usuario') then
    raise exception 'Usuario no válido';
  end if;
  update auth.users
  set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = p_id;
  update public.profiles set debe_cambiar_clave = true where id = p_id;  -- la persona la cambia al ingresar
  delete from auth.sessions where user_id = p_id;
end;
$$;

create or replace function public.soporte_editar_datos(p_id uuid, p_usuario text, p_email_contacto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.profiles
  set usuario = nullif(lower(btrim(p_usuario)), ''),
      email_contacto = nullif(lower(btrim(p_email_contacto)), '')
  where id = p_id and rol = 'usuario';
  if not found then raise exception 'Usuario no válido'; end if;
end;
$$;

revoke all on function public.soporte_listar_usuarios() from public, anon;
revoke all on function public.soporte_cambiar_estado(uuid, boolean) from public, anon;
revoke all on function public.soporte_restablecer_clave(uuid, text) from public, anon;
revoke all on function public.soporte_editar_datos(uuid, text, text) from public, anon;
grant execute on function public.soporte_listar_usuarios() to authenticated;
grant execute on function public.soporte_cambiar_estado(uuid, boolean) to authenticated;
grant execute on function public.soporte_restablecer_clave(uuid, text) to authenticated;
grant execute on function public.soporte_editar_datos(uuid, text, text) to authenticated;
