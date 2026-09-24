-- Nuevo tipo "Dúplex" y opción "Otro" (con texto libre) tanto para el tipo como para el estado de la propiedad.
alter type public.tipo_propiedad add value if not exists 'duplex' after 'departamento';
alter type public.estado_propiedad add value if not exists 'otro';
alter table public.propiedades
  add column tipo_otro text,
  add column estado_otro text;
alter table public.propiedades
  add constraint propiedades_tipo_otro_largo check (tipo_otro is null or char_length(tipo_otro) <= 60),
  add constraint propiedades_estado_otro_largo check (estado_otro is null or char_length(estado_otro) <= 60);
