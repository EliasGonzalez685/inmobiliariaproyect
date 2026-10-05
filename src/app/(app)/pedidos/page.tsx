import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import PanelPedidos, { type PedidoItem } from './PanelPedidos';

export const dynamic = 'force-dynamic';

export default async function Pedidos() {
  const supabase = await createClient();
  const [, { data: pedidos }, { data: propiedades }] = await Promise.all([
    requireProfile(),
    supabase.from('pedidos')
      .select('id, cliente_nombre, cliente_telefono, tipo, tipo_otro, ubicacion, medidas, presupuesto, moneda, descripcion, estado, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('propiedades')
      .select('id, titulo, codigo, tipo, barrio, ciudad, direccion, precio, moneda')
      .eq('estado', 'disponible'),
  ]);

  const lista: PedidoItem[] = (pedidos ?? []).map((p) => ({
    ...p, presupuesto: p.presupuesto === null ? null : Number(p.presupuesto),
  }));
  const disponibles = (propiedades ?? []).map((p) => ({ ...p, precio: p.precio === null ? null : Number(p.precio) }));

  return <PanelPedidos pedidos={lista} disponibles={disponibles} />;
}
