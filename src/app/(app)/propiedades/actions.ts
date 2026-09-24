'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { entero, num, txt } from '@/lib/format';
import { ESTADOS_PROPIEDAD, TIPOS_PROPIEDAD } from '@/lib/constants';
import { registrarOperacionPorEstado } from '@/lib/operacion-auto';

async function db() {
  const supabase = await createClient();
  // Verificación local del token (sin viajar a Supabase); la base de datos vuelve a exigir permisos por RLS.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  return supabase;
}

export type ResultadoPropiedad = { id?: string; error?: string; operacionId?: string };

// Ningún dato es obligatorio: si falta el título se arma solo (tipo + dirección/barrio/ciudad).
export async function guardarPropiedad(id: string | null, formData: FormData): Promise<ResultadoPropiedad> {
  const inicio = Date.now();
  const supabase = await db();
  const tipo = String(formData.get('tipo') ?? 'casa');
  const direccion = txt(formData.get('direccion'));
  const barrio = txt(formData.get('barrio'));
  const ciudad = txt(formData.get('ciudad'));
  const tipoOtro = tipo === 'otro' ? txt(formData.get('tipo_otro'))?.slice(0, 60) ?? null : null;
  const estado = String(formData.get('estado') ?? 'disponible');
  const estadoOtro = estado === 'otro' ? txt(formData.get('estado_otro'))?.slice(0, 60) ?? null : null;
  const titulo = String(formData.get('titulo') ?? '').trim()
    || [tipoOtro ?? TIPOS_PROPIEDAD[tipo as keyof typeof TIPOS_PROPIEDAD] ?? 'Propiedad', direccion ?? barrio ?? ciudad].filter(Boolean).join(' · ');

  const datos = {
    codigo: txt(formData.get('codigo')),
    titulo,
    tipo,
    tipo_otro: tipoOtro,
    estado,
    estado_otro: estadoOtro,
    operacion: String(formData.get('operacion') ?? 'administracion'),
    cliente_id: txt(formData.get('cliente_id')),
    direccion,
    barrio,
    ciudad,
    departamento: txt(formData.get('departamento')),
    latitud: num(formData.get('latitud')),
    longitud: num(formData.get('longitud')),
    superficie_terreno: num(formData.get('superficie_terreno')),
    superficie_construida: num(formData.get('superficie_construida')),
    medidas: txt(formData.get('medidas')),
    linderos: txt(formData.get('linderos')),
    dormitorios: entero(formData.get('dormitorios')),
    banos: entero(formData.get('banos')),
    cocheras: entero(formData.get('cocheras')),
    anio_construccion: entero(formData.get('anio_construccion')),
    servicios: formData.getAll('servicios').map(String),
    mejoras: txt(formData.get('mejoras')),
    finca_nro: txt(formData.get('finca_nro')),
    padron_nro: txt(formData.get('padron_nro')),
    lote_nro: txt(formData.get('lote_nro')),
    manzana_nro: txt(formData.get('manzana_nro')),
    cuenta_corriente_catastral: txt(formData.get('cuenta_corriente_catastral')),
    informacion_adicional: txt(formData.get('informacion_adicional')),
    precio: num(formData.get('precio')),
    moneda: String(formData.get('moneda') ?? 'PYG'),
    notas: txt(formData.get('notas')),
  };

  const traducir = (error: { code?: string }) =>
    error.code === '23505' ? 'Ese código interno ya está en uso por otra propiedad.'
      : error.code === '22003' ? 'Uno de los números es demasiado grande. Revísalo.'
      : 'No se pudo guardar la propiedad. Inténtalo de nuevo.';

  // No se revalida aquí: las páginas son dinámicas y el formulario recarga al terminar (así el guardado responde antes).
  if (id) {
    const { data: antes } = await supabase.from('propiedades').select('estado').eq('id', id).single();
    const { error } = await supabase.from('propiedades').update(datos).eq('id', id);
    console.log(`[guardarPropiedad] actualizar ${Date.now() - inicio} ms${error ? ` · error ${error.code} ${error.message}` : ''}`);
    if (error) return { error: traducir(error) };
    // Si el estado cambió a Vendida / Alquilada / Reservada, la operación se registra sola.
    let operacionId: string | undefined;
    if (antes && antes.estado !== estado) {
      const op = await registrarOperacionPorEstado(supabase, id, estado);
      if (op) operacionId = op.id;
    }
    return { id, operacionId };
  }
  const { data, error } = await supabase.from('propiedades').insert(datos).select('id').single();
  console.log(`[guardarPropiedad] crear ${Date.now() - inicio} ms${error ? ` · error ${error.code} ${error.message}` : ''}`);
  if (error || !data) return { error: traducir(error ?? {}) };
  return { id: data.id };
}

/** Cambio rápido de estado desde la ficha (por ejemplo cuando se alquila, se vende o entra en obra). */
export async function cambiarEstadoPropiedad(id: string, estado: string, estadoOtro: string | null): Promise<{ error?: string; operacionId?: string; operacionCreada?: boolean }> {
  const supabase = await db();
  if (!(estado in ESTADOS_PROPIEDAD)) return { error: 'Estado no válido.' };
  const otro = estado === 'otro' ? (estadoOtro ?? '').trim().slice(0, 60) : '';
  if (estado === 'otro' && !otro) return { error: 'Escribe cuál es el estado.' };
  const { data: antes } = await supabase.from('propiedades').select('estado').eq('id', id).single();
  const { error } = await supabase.from('propiedades').update({ estado, estado_otro: estado === 'otro' ? otro : null }).eq('id', id);
  if (error) return { error: 'No se pudo cambiar el estado. Inténtalo de nuevo.' };
  // Vendida / Alquilada / Reservada: la operación se registra sola con los datos que ya conocemos.
  const op = antes && antes.estado !== estado ? await registrarOperacionPorEstado(supabase, id, estado) : null;
  return op ? { operacionId: op.id, operacionCreada: op.creada } : {};
}

export async function eliminarPropiedad(id: string): Promise<{ ir: string }> {
  const supabase = await db();
  // Borra los archivos de Storage antes de eliminar la propiedad (las filas caen en cascada)
  const [{ data: fotos }, { data: docs }] = await Promise.all([
    supabase.from('propiedad_fotos').select('storage_path').eq('propiedad_id', id),
    supabase.from('propiedad_documentos').select('storage_path').eq('propiedad_id', id),
  ]);
  if (fotos?.length) await supabase.storage.from('fotos').remove(fotos.map((f) => f.storage_path));
  if (docs?.length) await supabase.storage.from('documentos').remove(docs.map((d) => d.storage_path));
  const { error } = await supabase.from('propiedades').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ir: '/propiedades' };
}

export async function agregarMantenimiento(propiedadId: string, formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.from('mantenimientos').insert({
    propiedad_id: propiedadId,
    titulo: String(formData.get('titulo') ?? '').trim(),
    descripcion: txt(formData.get('descripcion')),
    tipo: String(formData.get('tipo')),
    estado: String(formData.get('estado')),
    fecha: String(formData.get('fecha')),
    costo: num(formData.get('costo')),
    moneda: String(formData.get('moneda') ?? 'PYG'),
    responsable: txt(formData.get('responsable')),
    resultado: txt(formData.get('resultado')),
  });
  if (error) throw new Error(error.message);
}

export async function cambiarEstadoMantenimiento(id: string, propiedadId: string, estado: string) {
  const supabase = await db();
  const { error } = await supabase.from('mantenimientos').update({ estado }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function eliminarMantenimiento(id: string, propiedadId: string) {
  const supabase = await db();
  const { error } = await supabase.from('mantenimientos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
