-- El codigo interno de una propiedad debia ser unico solo DENTRO de cada empresa,
-- no en toda la base: cada inmobiliaria numera sus propiedades por su cuenta.
-- Antes: UNIQUE (codigo) a secas, por lo que una empresa no podia usar un codigo
-- (ej. "01") si OTRA empresa ya lo tenia usado para la suya.
alter table public.propiedades drop constraint if exists propiedades_codigo_key;
alter table public.propiedades add constraint propiedades_codigo_empresa_key unique (empresa_id, codigo);
