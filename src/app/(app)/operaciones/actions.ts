'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { num, txt } from '@/lib/format';
import { ESTADOS_OPERACION, ESTADO_POR_OPERACION, TIPOS_OPERACION } from '@/lib/constants';

export type ResultadoOperacion = { error?: string; ir?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

async function db() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  return supabase;
}

export async function guardarOperacion(id: string | null, _prev: ResultadoOperacion, formData: FormData): Promise<ResultadoOperacion> {
  const supabase = await db();

  const tipo = String(formData.get('tipo') ?? 'venta');
  const estado = String(formData.get('estado') ?? 'concretada');
  if (!(tipo in TIPOS_OPERACION)) return { error: 'Tipo de operación no válido.' };
  if (!(estado in ESTADOS_OPERACION)) return { error: 'Estado de la operación no válido.' };

  const fecha = String(formData.get('fecha') ?? '');
  if (!FECHA.test(fecha)) return { error: 'Indica la fecha de la operación.' };

  const propiedadId = txt(formData.get('propiedad_id'));
  const clienteId = txt(formData.get('cliente_id'));
  if ((propiedadId && !UUID.test(propiedadId)) || (clienteId && !UUID.test(clienteId))) return { error: 'Selección no válida.' };

  const monto = num(formData.get('monto'));
  const comision = num(formData.get('comision'));
  if ((monto !== null && monto < 0) || (comision !== null && comision < 0)) return { error: 'Los montos no pueden ser negativos.' };
  if (monto !== null && monto >= 1e14) return { error: 'El monto es demasiado grande. Revísalo.' };

  const inicio = txt(formData.get('fecha_inicio'));
  const fin = txt(formData.get('fecha_fin'));
  const esAlquiler = tipo === 'alquiler';
  if (esAlquiler && inicio && fin && fin < inicio) return { error: 'El fin del contrato no puede ser anterior al inicio.' };

  // Copia del título y del nombre: el historial se conserva aunque luego se elimine la propiedad o el cliente.
  const [{ data: prop }, { data: cli }] = await Promise.all([
    propiedadId ? supabase.from('propiedades').select('titulo').eq('id', propiedadId).single() : Promise.resolve({ data: null }),
    clienteId ? supabase.from('clientes').select('nombre').eq('id', clienteId).single() : Promise.resolve({ data: null }),
  ]);

  const datos = {
    propiedad_id: propiedadId,
    propiedad_titulo: prop?.titulo ?? null,
    tipo,
    tipo_otro: tipo === 'otro' ? txt(formData.get('tipo_otro'))?.slice(0, 60) ?? null : null,
    estado,
    fecha,
    monto,
    moneda: String(formData.get('moneda') ?? 'PYG'),
    comision,
    cliente_id: clienteId,
    cliente_nombre: cli?.nombre ?? null,
    fecha_inicio: esAlquiler ? inicio : null,
    fecha_fin: esAlquiler ? fin : null,
    forma_pago: txt(formData.get('forma_pago')),
    notas: txt(formData.get('notas')),
  };

  const { error } = id
    ? await supabase.from('operaciones').update(datos).eq('id', id)
    : await supabase.from('operaciones').insert(datos);
  if (error) return { error: 'No se pudo guardar la operación. Revisa los datos e inténtalo de nuevo.' };

  // Opcional: la propiedad pasa a "Vendida", "Alquilada" o "Reservada" según la operación.
  const nuevoEstado = ESTADO_POR_OPERACION[tipo];
  if (formData.get('actualizar_estado') === '1' && propiedadId && nuevoEstado && estado !== 'cancelada') {
    await supabase.from('propiedades').update({ estado: nuevoEstado, estado_otro: null }).eq('id', propiedadId);
  }

  const volver = txt(formData.get('volver'));
  return { ir: volver && UUID.test(volver) ? `/propiedades/${volver}?tab=operaciones` : '/operaciones' };
}

export async function eliminarOperacion(id: string, volverAPropiedad?: string): Promise<{ ir: string }> {
  const supabase = await db();
  const { error } = await supabase.from('operaciones').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ir: volverAPropiedad ? `/propiedades/${volverAPropiedad}?tab=operaciones` : '/operaciones' };
}
