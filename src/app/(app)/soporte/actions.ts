'use server';
import { revalidatePath } from 'next/cache';
import { requireSoporte } from '@/lib/auth';
import { CLAVE_MINIMA, errorDeDuplicado, normalizar, validarUsuarioYCorreo } from '@/lib/usuario';

export type Resultado = { ok?: string; error?: string } | null;

// Todas las acciones exigen ser super administrador (además, cada función SQL lo vuelve a comprobar).

export async function cambiarEstado(id: string, activo: boolean) {
  const { supabase } = await requireSoporte();
  const { error } = await supabase.rpc('soporte_cambiar_estado', { p_id: id, p_activo: activo });
  if (error) throw new Error(error.message);
  revalidatePath('/soporte');
}

export async function desbloquear(id: string) {
  const { supabase } = await requireSoporte();
  const { error } = await supabase.rpc('soporte_desbloquear', { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath('/soporte');
}

export async function restablecerClave(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase } = await requireSoporte();
  const id = String(formData.get('id') ?? '');
  const clave = String(formData.get('clave') ?? '');
  if (clave.length < CLAVE_MINIMA) return { error: `La contraseña temporal debe tener al menos ${CLAVE_MINIMA} caracteres.` };
  const { error } = await supabase.rpc('soporte_restablecer_clave', { p_id: id, p_clave: clave });
  if (error) return { error: 'No se pudo restablecer la contraseña.' };
  revalidatePath('/soporte');
  return { ok: 'Contraseña restablecida. Entrégasela a la persona: deberá crear una nueva al ingresar.' };
}

export async function editarDatos(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase } = await requireSoporte();
  const id = String(formData.get('id') ?? '');
  const usuario = normalizar(formData.get('usuario'));
  const correo = normalizar(formData.get('correo'));
  const invalido = validarUsuarioYCorreo(usuario, correo);
  if (invalido) return { error: invalido };
  const { error } = await supabase.rpc('soporte_editar_datos', { p_id: id, p_usuario: usuario, p_email_contacto: correo });
  if (error) return { error: errorDeDuplicado(error) ?? 'No se pudieron guardar los datos.' };
  revalidatePath('/soporte');
  return { ok: 'Datos actualizados.' };
}
