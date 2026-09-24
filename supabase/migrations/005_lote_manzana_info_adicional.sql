-- Datos legales: la matrícula se reemplaza por Lote N.° y Manzana N.°; "normativas" pasa a ser "información adicional".
alter table public.propiedades
  add column lote_nro text,
  add column manzana_nro text;

alter table public.propiedades drop column matricula;
alter table public.propiedades rename column normativas to informacion_adicional;
