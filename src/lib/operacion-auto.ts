import type { SupabaseClient } from '@supabase/supabase-js';

/** Estado de la propiedad → operación que se registra sola. */
export const OPERACION_POR_ESTADO: Record<string, 'venta' | 'alquiler' | 'reserva'> = {
  vendida: 'venta',
  alquilada: 'alquiler',
  reservada: 'reserva',
};

export type OperacionAuto = { id: string; creada: boolean };

/**
 * Cuando una propiedad pasa a Vendida / Alquilada / Reservada se crea sola la operación
 * con lo que ya se sabe (propiedad, tipo, fecha de hoy, precio, moneda y cliente).
 * Solo quedan por completar los extras (comisión, forma de pago, contrato…).
 * Si hoy ya existe una operación del mismo tipo para esa propiedad, no se duplica.
 */
export async function registrarOperacionPorEstado(
  supabase: SupabaseClient,
  propiedadId: string,
  estadoNuevo: string,
): Promise<OperacionAuto | null> {
  const tipo = OPERACION_POR_ESTADO[estadoNuevo];
  if (!tipo) return null;

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });

  const { data: existente } = await supabase.from('operaciones').select('id')
    .eq('propiedad_id', propiedadId).eq('tipo', tipo).eq('fecha', hoy).neq('estado', 'cancelada')
    .order('created_at', { ascending: false }).limit(1);
  if (existente?.[0]) return { id: existente[0].id, creada: false };

  const { data: p } = await supabase.from('propiedades')
    .select('titulo, precio, moneda, cliente_id, clientes(nombre)').eq('id', propiedadId).single();
  if (!p) return null;

  const cliente = p.clientes as unknown as { nombre: string } | null;
  const { data, error } = await supabase.from('operaciones').insert({
    propiedad_id: propiedadId,
    propiedad_titulo: p.titulo,
    tipo,
    estado: tipo === 'reserva' ? 'en_curso' : 'concretada',
    fecha: hoy,
    monto: p.precio,
    moneda: p.moneda,
    cliente_id: p.cliente_id,
    cliente_nombre: cliente?.nombre ?? null,
    fecha_inicio: tipo === 'alquiler' ? hoy : null,
  }).select('id').single();
  if (error || !data) return null;
  return { id: data.id, creada: true };
}
