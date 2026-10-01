import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Cliente con permisos de administrador: SOLO para crear cuentas nuevas desde Soporte
// (es la única forma soportada de crear un usuario en Supabase Auth sin que la persona
// se registre ella misma). Nunca se importa desde un componente de cliente ni se expone
// al navegador: la clave vive en SUPABASE_SERVICE_ROLE_KEY, una variable de entorno sin
// el prefijo NEXT_PUBLIC_, así que Next.js nunca la incluye en el código que baja al navegador.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
