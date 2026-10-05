'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { num, txt } from '@/lib/format';
import { ESTADOS_PEDIDO, TIPOS_PROPIEDAD } from '@/lib/constants';

export type ResultadoPedido = { error?: string; ir?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function db() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');
  return supabase;
}

export async function guardarPedido(id: string | null, _prev: ResultadoPedido, formData: FormData): Promise<ResultadoPedido> {
  const supabase = await db();

  const tipo = String(formData.get('tipo') ?? 'casa');
  if (!(tipo in TIPOS_PROPIEDAD)) return { error: 'Tipo de propiedad no válido.' };
  const estado = String(formData.get('estado') ?? 'pendiente');
  if (!(estado in ESTADOS_PEDIDO)) return { error: 'Estado no válido.' };

  // El pedido queda a nombre de un cliente ya registrado, o con los datos escritos a mano si todavía no lo está.
  const clienteId = txt(formData.get('cliente_id'));
  let clienteNombre: string | null;
  let clienteTelefono: string | null;
  if (clienteId) {
    if (!UUID.test(clienteId)) return { error: 'Selección de cliente no válida.' };
    const { data: cli } = await supabase.from('clientes').select('nombre, telefono').eq('id', clienteId).single();
    if (!cli) return { error: 'El cliente seleccionado no es válido.' };
    clienteNombre = cli.nombre;
    clienteTelefono = cli.telefono ?? null;
  } else {
    clienteNombre = txt(formData.get('cliente_nombre'));
    clienteTelefono = txt(formData.get('cliente_telefono'));
    if (!clienteNombre) return { error: 'Escribe el nombre de quien hace el pedido, o selecciona un cliente registrado.' };
  }

  const presupuesto = num(formData.get('presupuesto'));
  if (presupuesto !== null && presupuesto < 0) return { error: 'El presupuesto no puede ser negativo.' };

  const datos = {
    cliente_id: clienteId,
    cliente_nombre: clienteNombre,
    cliente_telefono: clienteTelefono,
    tipo,
    tipo_otro: tipo === 'otro' ? txt(formData.get('tipo_otro'))?.slice(0, 60) ?? null : null,
    ubicacion: txt(formData.get('ubicacion')),
    medidas: txt(formData.get('medidas')),
    presupuesto,
    moneda: String(formData.get('moneda') ?? 'PYG'),
    descripcion: txt(formData.get('descripcion')),
    estado,
  };

  const { error } = id
    ? await supabase.from('pedidos').update(datos).eq('id', id)
    : await supabase.from('pedidos').insert(datos);
  if (error) return { error: 'No se pudo guardar el pedido. Revisa los datos e inténtalo de nuevo.' };

  revalidatePath('/pedidos');
  return { ir: '/pedidos' };
}

export async function cambiarEstadoPedido(id: string, estado: string) {
  const supabase = await db();
  if (!(estado in ESTADOS_PEDIDO)) throw new Error('Estado no válido.');
  const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/pedidos');
}

export async function eliminarPedido(id: string): Promise<{ ir: string }> {
  const supabase = await db();
  const { error } = await supabase.from('pedidos').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ir: '/pedidos' };
}
