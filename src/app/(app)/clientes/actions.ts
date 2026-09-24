'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { txt } from '@/lib/format';

export type ResultadoCliente = { error?: string; ir?: string } | null;

export async function guardarCliente(id: string | null, _prev: ResultadoCliente, formData: FormData): Promise<ResultadoCliente> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login');

  const datos = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    tipo: String(formData.get('tipo') ?? 'propietario'),
    documento: txt(formData.get('documento')),
    telefono: txt(formData.get('telefono')),
    email: txt(formData.get('email')),
    direccion: txt(formData.get('direccion')),
    notas: txt(formData.get('notas')),
  };
  if (!datos.nombre) return { error: 'Escribe el nombre del cliente (es el único dato obligatorio).' };

  const { error } = id
    ? await supabase.from('clientes').update(datos).eq('id', id)
    : await supabase.from('clientes').insert(datos);
  if (error) return { error: 'No se pudo guardar el cliente. Inténtalo de nuevo.' };
  return { ir: id ? `/clientes/${id}` : '/clientes' };
}

export async function eliminarCliente(id: string): Promise<{ ir: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ir: '/clientes' };
}
