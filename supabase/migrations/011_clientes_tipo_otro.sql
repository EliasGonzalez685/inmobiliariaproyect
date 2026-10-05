-- Igual que en propiedades (ver migración 007): permite escribir un nombre libre cuando el "Tipo"
-- de cliente elegido es "Otro".
alter table public.clientes
  add column tipo_otro text;
alter table public.clientes
  add constraint clientes_tipo_otro_largo check (tipo_otro is null or char_length(tipo_otro) <= 60);
