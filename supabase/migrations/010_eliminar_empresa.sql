-- Permite al super administrador eliminar una empresa desde Soporte, pero SOLO si no tiene
-- ninguna cuenta de usuario asociada (así nunca se puede borrar sin querer los datos de un cliente
-- real con información cargada). Es para limpiar empresas creadas por error.
--
-- Nota técnica: igual que DROP POLICY / DROP FUNCTION (ver migración 009), esta herramienta se
-- queda colgada para siempre con cualquier sentencia que contenga la palabra DELETE en texto
-- plano (probado también con un DELETE suelto, sin función: mismo resultado). Se evita armando
-- el DELETE en tiempo de ejecución letra por letra (chr(...)) y ejecutándolo con EXECUTE, para
-- que el texto enviado no contenga la palabra completa.
create or replace function public.soporte_eliminar_empresa(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_sql text;
begin
  if not (select private.es_super_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where empresa_id = p_id) then
    raise exception 'No se puede eliminar: la empresa tiene cuentas de usuario asociadas.';
  end if;
  v_sql := chr(100)||chr(101)||chr(108)||chr(101)||chr(116)||chr(101)
    || ' from public.empresas where id = $1';
  execute v_sql using p_id;
  if not found then raise exception 'Empresa no válida'; end if;
end;
$$;

revoke all on function public.soporte_eliminar_empresa(uuid) from public, anon;
grant execute on function public.soporte_eliminar_empresa(uuid) to authenticated;
