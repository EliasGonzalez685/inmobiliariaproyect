-- Seguridad de ingreso: bloqueo temporal tras intentos fallidos.
--  · 5 contraseñas incorrectas seguidas (ventana de 15 min) → cuenta bloqueada 15 min.
--  · Cada nuevo bloqueo duplica el tiempo (15, 30, 60 min … máximo 24 h) hasta un ingreso correcto.
--  · Se aplica igual a usuarios que no existen, para no revelar qué cuentas son reales.
--  · El super administrador puede desbloquear desde Soporte; restablecer la contraseña también desbloquea.

create table private.intentos_login (
  clave text primary key,                 -- correo interno de la cuenta (o "x:" + lo escrito si no existe)
  fallos int not null default 0,
  bloqueos int not null default 0,
  ultimo_fallo timestamptz not null default now(),
  bloqueado_hasta timestamptz
);

-- Clave con la que se cuentan los intentos de un identificador (usuario o correo).
create or replace function private.clave_intento(p_identificador text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.email
       from public.profiles p
      where p.email is not null
        and (p.usuario = lower(btrim(p_identificador))
             or p.email_contacto = lower(btrim(p_identificador))
             or lower(p.email) = lower(btrim(p_identificador)))
      order by case when p.usuario = lower(btrim(p_identificador)) then 0 else 1 end
      limit 1),
    'x:' || left(lower(btrim(coalesce(p_identificador, ''))), 100)
  );
$$;

-- Segundos que faltan para poder volver a intentar (0 = no está bloqueado).
create or replace function public.login_bloqueo(p_identificador text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select ceil(extract(epoch from (bloqueado_hasta - now())))::int
    from private.intentos_login
    where clave = private.clave_intento(p_identificador) and bloqueado_hasta > now()
  ), 0);
$$;

-- Registra un intento fallido. Devuelve {bloqueado_segundos, restantes}.
create or replace function public.login_fallo(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text := private.clave_intento(p_identificador);
  r private.intentos_login%rowtype;
  n_fallos int;
  n_bloqueos int;
  hasta timestamptz;
  max_fallos constant int := 5;
begin
  -- limpieza de registros viejos
  delete from private.intentos_login
   where ultimo_fallo < now() - interval '2 days' and (bloqueado_hasta is null or bloqueado_hasta < now());

  insert into private.intentos_login (clave) values (k) on conflict (clave) do nothing;
  select * into r from private.intentos_login where clave = k for update;

  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return jsonb_build_object('bloqueado_segundos', ceil(extract(epoch from (r.bloqueado_hasta - now())))::int, 'restantes', 0);
  end if;

  n_fallos := case when r.fallos = 0 or r.ultimo_fallo < now() - interval '15 minutes' then 1 else r.fallos + 1 end;
  n_bloqueos := case when r.ultimo_fallo < now() - interval '24 hours' then 0 else r.bloqueos end;
  hasta := null;

  if n_fallos >= max_fallos then
    hasta := now() + make_interval(mins => least(15 * power(2, n_bloqueos)::int, 1440));
    n_bloqueos := n_bloqueos + 1;
    n_fallos := 0;
  end if;

  update private.intentos_login
     set fallos = n_fallos, bloqueos = n_bloqueos, ultimo_fallo = now(), bloqueado_hasta = hasta
   where clave = k;

  return jsonb_build_object(
    'bloqueado_segundos', case when hasta is null then 0 else ceil(extract(epoch from (hasta - now())))::int end,
    'restantes', case when hasta is null then max_fallos - n_fallos else 0 end
  );
end;
$$;

-- Ingreso correcto: quien llama (ya autenticado) borra el contador de su propia cuenta.
create or replace function public.login_exito()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.intentos_login
  where clave = (select p.email from public.profiles p where p.id = (select auth.uid()));
$$;

-- Soporte: desbloquear una cuenta.
create or replace function public.soporte_desbloquear(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from private.intentos_login
   where clave = (select email from public.profiles where id = p_id and rol = 'usuario');
end;
$$;

-- Soporte: la lista ahora informa hasta cuándo está bloqueada cada cuenta.
drop function public.soporte_listar_usuarios();
create function public.soporte_listar_usuarios()
returns table (
  id uuid, usuario text, nombre text, email_contacto text,
  activo boolean, debe_cambiar_clave boolean, ultimo_acceso timestamptz, creado timestamptz,
  bloqueado_hasta timestamptz
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
           (select i.bloqueado_hasta from private.intentos_login i where i.clave = p.email and i.bloqueado_hasta > now())
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.rol = 'usuario'
    order by p.created_at;
end;
$$;

-- Restablecer la contraseña también desbloquea la cuenta.
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
  update public.profiles set debe_cambiar_clave = true where id = p_id;
  delete from auth.sessions where user_id = p_id;
  delete from private.intentos_login where clave = (select email from public.profiles where id = p_id);
end;
$$;

revoke all on function private.clave_intento(text) from public, anon, authenticated;
revoke all on function public.login_bloqueo(text) from public;
revoke all on function public.login_fallo(text) from public;
revoke all on function public.login_exito() from public, anon;
revoke all on function public.soporte_desbloquear(uuid) from public, anon;
revoke all on function public.soporte_listar_usuarios() from public, anon;
revoke all on function public.soporte_restablecer_clave(uuid, text) from public, anon;
grant execute on function public.login_bloqueo(text) to anon, authenticated;
grant execute on function public.login_fallo(text) to anon, authenticated;
grant execute on function public.login_exito() to authenticated;
grant execute on function public.soporte_desbloquear(uuid) to authenticated;
grant execute on function public.soporte_listar_usuarios() to authenticated;
grant execute on function public.soporte_restablecer_clave(uuid, text) to authenticated;
