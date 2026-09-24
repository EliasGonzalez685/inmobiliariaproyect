'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CLAVE_MINIMA, errorDeDuplicado, normalizar, validarUsuarioYCorreo } from '@/lib/usuario';

export type Resultado = { ok?: string; error?: string; ir?: string } | null;

export async function guardarDatosPersonales(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const nombre = String(formData.get('nombre') ?? '').trim();
  const usuario = normalizar(formData.get('usuario'));
  const correo = normalizar(formData.get('correo'));
  if (!nombre) return { error: 'Escribe tu nombre.' };
  const invalido = validarUsuarioYCorreo(usuario, correo);
  if (invalido) return { error: invalido };

  const { error } = await supabase
    .from('profiles')
    .update({ nombre, usuario, email_contacto: correo || null })
    .eq('id', user.id);
  if (error) return { error: errorDeDuplicado(error) ?? 'No se pudieron guardar los datos. Inténtalo de nuevo.' };

  revalidatePath('/', 'layout');
  return { ok: 'Datos guardados. Desde ahora puedes ingresar con este usuario o con tu correo.' };
}

export async function cambiarClave(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect('/login');

  const actual = String(formData.get('actual') ?? '');
  const nueva = String(formData.get('nueva') ?? '');
  const confirmar = String(formData.get('confirmar') ?? '');
  const forzar = formData.get('forzar') === '1';

  if (!actual) return { error: 'Escribe tu contraseña actual.' };
  if (nueva.length < CLAVE_MINIMA) return { error: `La nueva contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` };
  if (nueva !== confirmar) return { error: 'La confirmación no coincide con la nueva contraseña.' };
  if (nueva === actual) return { error: 'La nueva contraseña debe ser distinta de la actual.' };

  // Verifica la contraseña actual antes de permitir el cambio.
  const { data: espera } = await supabase.rpc('login_bloqueo', { p_identificador: user.email });
  if (typeof espera === 'number' && espera > 0) {
    return { error: `Demasiados intentos fallidos. Por seguridad, espera ${Math.ceil(espera / 60)} minuto(s) antes de volver a intentarlo.` };
  }
  const { error: errActual } = await supabase.auth.signInWithPassword({ email: user.email, password: actual });
  if (errActual) {
    await supabase.rpc('login_fallo', { p_identificador: user.email });
    return { error: 'La contraseña actual no es correcta.' };
  }
  await supabase.rpc('login_exito');

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    const debil = /weak|pwned|compromised|easy to guess/i.test(error.message);
    return { error: debil ? 'Esa contraseña es demasiado fácil de adivinar. Elige otra más segura.' : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.' };
  }

  await supabase.from('profiles').update({ debe_cambiar_clave: false }).eq('id', user.id);
  await supabase.auth.signOut({ scope: 'others' }); // cierra la sesión en otros dispositivos

  revalidatePath('/', 'layout');
  if (forzar) return { ir: '/' };
  return { ok: 'Contraseña actualizada correctamente.' };
}
