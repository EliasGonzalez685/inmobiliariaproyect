-- Las cuentas nuevas nacen DESACTIVADAS: solo entra quien el administrador habilite explícitamente.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nombre, activo)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)), false);
  return new;
end;
$$;
