import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import PanelOperaciones, { type OperacionItem } from './PanelOperaciones';

export const dynamic = 'force-dynamic';

export default async function Operaciones() {
  // La verificación de la cuenta y la consulta corren a la vez (una espera menos por página).
  const supabase = await createClient();
  const [, { data }] = await Promise.all([requireProfile(), supabase.from('operaciones')
    .select('id, propiedad_id, propiedad_titulo, tipo, tipo_otro, estado, fecha, monto, moneda, comision, cliente_nombre, fecha_inicio, fecha_fin, forma_pago, notas, propiedades(titulo), clientes(nombre)')
    .order('fecha', { ascending: false }).order('created_at', { ascending: false })]);

  const operaciones: OperacionItem[] = (data ?? []).map((o) => ({
    id: o.id, propiedad_id: o.propiedad_id,
    propiedad: (o.propiedades as unknown as { titulo: string } | null)?.titulo ?? o.propiedad_titulo,
    tipo: o.tipo, tipo_otro: o.tipo_otro, estado: o.estado, fecha: o.fecha,
    monto: o.monto === null ? null : Number(o.monto), moneda: o.moneda,
    comision: o.comision === null ? null : Number(o.comision),
    cliente: (o.clientes as unknown as { nombre: string } | null)?.nombre ?? o.cliente_nombre,
    fecha_inicio: o.fecha_inicio, fecha_fin: o.fecha_fin, forma_pago: o.forma_pago, notas: o.notas,
  }));

  return <PanelOperaciones operaciones={operaciones} />;
}
