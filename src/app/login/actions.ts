'use server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type ResultadoLogin = { error?: string; ir?: string } | null;

function textoEspera(segundos: number) {
  const min = Math.max(1, Math.ceil(segundos / 60));
  if (min >= 60) {
    const h = Math.ceil(min / 60);
    return `${h} hora${h === 1 ? '' : 's'}`;
  }
  return `${min} minuto${min === 1 ? '' : 's'}`;
}

const mensajeBloqueo = (seg: number) =>
  `Demasiados intentos fallidos. Por seguridad el acceso quedó bloqueado. Vuelve a intentarlo en ${textoEspera(seg)} o pide ayuda a soporte.`;

/**
 * Inicio de sesión con protección contra adivinar contraseñas:
 * tras 5 intentos fallidos la cuenta se bloquea temporalmente (ver migración 006).
 */
export async function iniciarSesion(_prev: ResultadoLogin, formData: FormData): Promise<ResultadoLogin> {
  const identificador = String(formData.get('usuario') ?? '').trim().slice(0, 200);
  const clave = String(formData.get('password') ?? '').slice(0, 200);
  if (!identificador || !clave) return { error: 'Escribe tu usuario y tu contraseña.' };

  const supabase = await createClient();

  const { data: espera } = await supabase.rpc('login_bloqueo', { p_identificador: identificador });
  if (typeof espera === 'number' && espera > 0) return { error: mensajeBloqueo(espera) };

  const { data: emailInterno } = await supabase.rpc('resolver_login', { p_identificador: identificador });
  const { error } = emailInterno
    ? await supabase.auth.signInWithPassword({ email: emailInterno as string, password: clave })
    : { error: new Error('desconocido') };

  if (error) {
    const { data } = await supabase.rpc('login_fallo', { p_identificador: identificador });
    const r = (data ?? {}) as { bloqueado_segundos?: number; restantes?: number };
    if (r.bloqueado_segundos && r.bloqueado_segundos > 0) return { error: mensajeBloqueo(r.bloqueado_segundos) };
    const resto = r.restantes ?? 5;
    return {
      error: resto <= 2
        ? `Usuario o contraseña incorrectos. Te ${resto === 1 ? 'queda 1 intento' : `quedan ${resto} intentos`} antes de que se bloquee el acceso.`
        : 'Usuario o contraseña incorrectos.',
    };
  }

  await supabase.rpc('login_exito');
  // Marca de actividad: el middleware cierra la sesión si pasa mucho tiempo sin usar el sistema.
  (await cookies()).set('ultima_actividad', String(Date.now()), { path: '/', sameSite: 'lax' });
  return { ir: '/' };
}
