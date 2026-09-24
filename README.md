# INMOBILIARIAPROYECT

Sistema interno de gestión de propiedades y control de operaciones (web responsive / PWA) con Next.js 15 + Supabase.
El acceso es **solo con usuario (o correo) y contraseña**: sin sesión no se ve nada.

## Roles
| Rol | Quién | Qué hace |
|---|---|---|
| `super_admin` | Elias (`elias`) | Panel **Soporte**: activar/desactivar cuentas, restablecer contraseñas, corregir usuario/correo. **No accede** a propiedades, clientes, fotos ni documentos. |
| `usuario` | Personal (`usuario1`, `usuario2`) | Trabajo diario: propiedades, clientes, mantenimiento, operaciones. No ven a otros usuarios. |

## Estado de Supabase
Proyecto `kdvbiupisxgzeogvtdds` (São Paulo). Migraciones ya aplicadas (`supabase/migrations/`):
- `001_schema.sql`: tablas, seguridad (RLS), buckets privados `fotos` y `documentos`.
- `002_registro_seguro.sql`: toda cuenta nueva nace **desactivada**.
- `003_cuentas_y_soporte.sql`: nombre de usuario y correo editables, ingreso por usuario/correo, aislamiento del super admin y funciones de soporte.
- `004_fotos_y_videos.sql`: cada propiedad admite fotos y videos (videos de hasta 50 MB).
- `005_lote_manzana_info_adicional.sql`: en datos legales, la matrícula se reemplaza por Lote N.° y Manzana N.°; "normativas" pasa a "información adicional".
- `006_seguridad_login.sql`: bloqueo temporal por intentos fallidos de ingreso y función de soporte para desbloquear.
- `008_operaciones.sql`: control de operaciones (ventas, alquileres, reservas…) con fecha, monto, comisión y cliente; reemplaza a los vencimientos (sus tablas se conservan sin uso).
- `007_duplex_y_otros.sql`: nuevo tipo Dúplex y opción "Otro" (con texto libre) para tipo y estado; el estado se puede cambiar rápido desde la ficha.

## Ejecutar en tu PC
```powershell
npm install
npm run dev -- -p 3005
```
Abrir http://localhost:3005. Las claves ya están en `.env.local` (solo la clave pública/publishable).
Para usarlo **más rápido** (versión optimizada, sin compilar cada página al vuelo): `npm run rapido`.

**Sesión:** siempre se pide usuario y contraseña al abrir el sistema. La sesión se cierra al cerrar el navegador y también tras 30 minutos sin actividad (`MINUTOS_INACTIVIDAD` en `src/middleware.ts`).

## Cómo funciona el ingreso
- Cada cuenta tiene un correo **interno** (`usuario@inmobiliariaproyect.app`) que nunca cambia y que la persona no necesita conocer.
- En **Mi cuenta → Datos personales** cada persona define su *nombre de usuario* (letras, números, `.`, `-`, `_`) y, opcionalmente, su *correo*. En el login sirve cualquiera de los dos.
- **Mi cuenta → Cambiar contraseña**: pide la actual y cierra las sesiones en otros dispositivos.
- Si alguien olvida su acceso: el super admin entra a **Soporte → Restablecer contraseña** (puede generar una temporal). La persona deberá crear una nueva al ingresar.

## Crear una cuenta nueva
1. Supabase → Authentication → Users → Add user → **Create new user**, con "Auto Confirm User" marcado. Correo: `nombre@inmobiliariaproyect.app`.
2. Activarla (SQL Editor): `update public.profiles set activo = true where email = 'nombre@inmobiliariaproyect.app';`
   (o desde el panel Soporte si ya existe y está desactivada).
3. Authentication → Sign In / Providers → Email: mantener desactivado **Allow new users to sign up**.

## Propiedades, clientes, fotos y videos
- **Ningún dato de una propiedad es obligatorio.** Si dejas el título vacío se arma solo (tipo + dirección/barrio/ciudad). En un cliente solo el nombre es obligatorio.
- Las fotos y videos se pueden subir al crear la propiedad o después, en la pestaña **Fotos y videos**. Videos: hasta 50 MB (constante `MAX_VIDEO_MB` en `src/lib/media.ts`; para permitir más, subir también el límite global en Supabase → Storage → Settings y el del bucket `fotos`).
- Todo se puede **editar** (propiedad, cliente, y descripción/categoría/fecha de cada foto o video) y **eliminar**. Al eliminar una propiedad se borran también sus archivos.

## Seguridad
- **Bloqueo por intentos fallidos:** 5 contraseñas incorrectas seguidas → la cuenta se bloquea 15 minutos; cada bloqueo repetido duplica el tiempo (máximo 24 h). Aplica también al cambio de contraseña en "Mi cuenta" y es igual para usuarios inexistentes (no revela qué cuentas existen). El super admin ve "Bloqueado" en Soporte y puede **Desbloquear** (restablecer la contraseña también desbloquea).
- Cabeceras HTTP de seguridad (no se puede incrustar el sitio en otras páginas, HSTS, etc.) en `next.config.mjs`.
- Sesión: se cierra al cerrar el navegador, a los 30 min sin actividad y **cada vez que se reinicia el servidor** (después de cualquier cambio, `localhost` vuelve a empezar en el login).
- RLS activo en todas las tablas; solo personal activo con rol `usuario` accede a los datos del negocio.
- Cada persona solo puede modificar su nombre, usuario y correo; nunca su rol ni su estado.
- Las funciones `soporte_*` comprueban dentro de la base de datos que quien llama es super admin.
- Buckets privados (URLs firmadas de 1 hora). La app no usa ninguna clave secreta (service role).

## Operaciones (ventas, alquileres, reservas)
- Menú **Operaciones**: cada operación guarda tipo (venta, alquiler, reserva u otro), estado (concretada / en curso / cancelada), fecha, propiedad, cliente, monto, moneda (Gs. o US$), comisión, forma de pago y, en alquileres, la vigencia del contrato.
- El panel muestra totales, promedio por operación, promedio mensual, comisiones, evolución de los últimos 12 meses y resumen por tipo. Los filtros (período, tipo, estado, búsqueda) responden al instante y los totales solo cuentan operaciones **concretadas**, separados por moneda.
- Al registrar una venta, alquiler o reserva se puede marcar la propiedad como Vendida, Alquilada o Reservada con un solo clic.
- **Registro automático:** al cambiar el estado de una propiedad a Vendida, Alquilada o Reservada (desde la ficha o al editarla) la operación se crea sola con la propiedad, la fecha de hoy, el precio, la moneda y el cliente de la ficha. Solo falta completar los extras (comisión, forma de pago, contrato) con el botón «Completar comisión y forma de pago»; las operaciones con datos pendientes muestran el aviso «Faltan datos». No se duplica si ese mismo día ya existe una operación del mismo tipo.
- Cada propiedad tiene además una pestaña **Operaciones** con su historial. El historial se conserva aunque luego se elimine la propiedad o el cliente.

## Excel y PDF para imprimir
- En **Propiedades** y en **Operaciones** hay dos botones, **Excel** y **PDF**, que descargan la lista completa guardada (siempre todo, sin importar los filtros de pantalla). Cada lista se descarga por separado.
- Excel: una hoja con todas las columnas (datos técnicos y legales en propiedades; montos, comisiones y contrato en operaciones), fechas y números reales para ordenar o calcular, y un resumen por moneda de las operaciones concretadas.
- PDF: hoja A4 horizontal lista para imprimir, con fecha, cantidad de registros, encabezados repetidos en cada página y numeración.
- Solo lo descargan usuarios activos con acceso a los datos (el super administrador no ve datos del negocio). Requiere `npm install` la primera vez (librerías exceljs y jspdf).

## Sin trabas al guardar y navegar
- Todos los enlaces son normales del navegador y, al tocarlos, aparece al instante una barra de progreso arriba y la pantalla se atenúa mientras carga la página siguiente (así nunca parece que se quedó trabado).
- Guardar y eliminar (operaciones, clientes, propiedades, estado, mantenimientos) se hace con una petición directa a `/api/accion/<nombre>` con tiempo máximo de 25 s; si el servidor no responde se muestra un aviso y se puede reintentar. Ya no dependen de la cola interna de Next.js.
- Cada página consulta la cuenta y los datos a la vez (una espera menos por pantalla).
- En la terminal donde corre el sistema se imprime `[accion] nombre NNN ms` por cada guardado, para poder medir tiempos.

## Subida de fotos y videos
- Al elegir archivos se muestran al instante con miniatura, tamaño y estado. En la pestaña «Fotos y videos» de una propiedad se suben solos (con la categoría y fecha de arriba) y se ve el avance real de cada uno (porcentaje y barra); al terminar, la galería se actualiza sola.
- En «Nueva propiedad» los archivos elegidos quedan en cola con miniatura y se suben al crear la propiedad, mostrando el avance de cada uno.
- Si un archivo falla (peso máximo, formato) se indica cuál y por qué, y el resto sigue subiéndose.
