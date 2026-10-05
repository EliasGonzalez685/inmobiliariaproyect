-- La comisión se pacta con el dueño al cargar la propiedad (no cuando se concreta la venta/alquiler).
-- Queda guardado el monto acordado; en Operaciones se sigue marcando si ya se cobró o no.
alter table public.propiedades
  add column comision_pactada numeric(14,2);
