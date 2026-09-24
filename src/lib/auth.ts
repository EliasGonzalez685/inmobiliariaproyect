import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Sesión válida y cuenta activa (cualquier rol).
 * Rápida: el token se verifica de forma local (getClaims) y `cache` evita repetir la consulta
 * del perfil cuando el layout y la página la piden en la misma visita.
 */
export const requireCuenta = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', claims.sub).single();
  if (!profile || !profile.activo) {
    await supabase.auth.signOut();
    redirect('/login?error=inactivo');
  }
  return { supabase, user: { id: claims.sub, email: claims.email as string | undefined }, profile };
});

/**
 * Acceso al trabajo diario de la inmobiliaria (propiedades, clientes, operaciones…).
 * El super administrador NO trabaja con estos datos: se le envía a su panel de soporte.
 * Si el soporte restableció la contraseña, la persona debe crear una nueva antes de continuar.
 */
export async function requireProfile() {
  const ctx = await requireCuenta();
  if (ctx.profile.rol === 'super_admin') redirect('/soporte');
  if (ctx.profile.debe_cambiar_clave) redirect('/cuenta?forzar=1');
  return ctx;
}

/** Panel de soporte: solo super administrador. */
export async function requireSoporte() {
  const ctx = await requireCuenta();
  if (ctx.profile.rol !== 'super_admin') redirect('/');
  return ctx;
}
