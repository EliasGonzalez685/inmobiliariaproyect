-- Para saber, de la comisión de cada operación, si ya se cobró/pagó y cuándo.
alter table public.operaciones
  add column comision_pagada boolean not null default false,
  add column comision_fecha_pago date;
