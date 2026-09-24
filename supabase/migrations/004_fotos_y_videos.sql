-- Cada archivo multimedia de una propiedad puede ser foto o video (mismo bucket privado 'fotos').
alter table public.propiedad_fotos
  add column tipo_media text not null default 'foto' check (tipo_media in ('foto', 'video'));

-- Videos: hasta 50 MB por archivo (el límite global de Storage del proyecto debe ser >= a este valor).
update storage.buckets set file_size_limit = 52428800 where id = 'fotos';
