'use server';
import { revalidatePath } from 'next/cache';
import { requireSoporte } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { CLAVE_MINIMA, DOMINIO_USUARIOS, errorDeDuplicado, normalizar, validarUsuarioYCorreo } from '@/lib/usuario';

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

// ───────────────────────── Empresas (clientes a quienes se les vende el sistema) ─────────────────────────

export async function crearEmpresa(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase } = await requireSoporte();
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (nombre.length < 2) return { error: 'Escribe el nombre de la empresa.' };
  const { error } = await supabase.rpc('soporte_crear_empresa', { p_nombre: nombre });
  if (error) return { error: 'No se pudo crear la empresa.' };
  revalidatePath('/soporte');
  return { ok: `Empresa "${nombre}" creada. Ahora puedes agregarle sus usuarios.` };
}

export async function cambiarEstadoEmpresa(id: string, activo: boolean) {
  const { supabase } = await requireSoporte();
  const { error } = await supabase.rpc('soporte_cambiar_estado_empresa', { p_id: id, p_activo: activo });
  if (error) throw new Error(error.message);
  revalidatePath('/soporte');
}

// Crea la cuenta en Supabase Auth (con permisos de administrador, sin que la persona se registre)
// y, si todo sale bien, la asigna a su empresa y la deja activa con una contraseña temporal.
export async function crearCuenta(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const { supabase } = await requireSoporte();
  const empresaId = String(formData.get('empresa_id') ?? '');
  const usuario = normalizar(formData.get('usuario'));
  const nombre = String(formData.get('nombre') ?? '').trim();
  const correo = normalizar(formData.get('correo'));
  const clave = String(formData.get('clave') ?? '');

  if (!empresaId) return { error: 'Falta la empresa.' };
  const invalido = validarUsuarioYCorreo(usuario, correo);
  if (invalido) return { error: invalido };
  if (!nombre) return { error: 'Escribe el nombre de la persona.' };
  if (clave.length < CLAVE_MINIMA) return { error: `La contraseña temporal debe tener al menos ${CLAVE_MINIMA} caracteres.` };

  let nuevoId: string;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: `${usuario}@${DOMINIO_USUARIOS}`,
      password: clave,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error || !data?.user) {
      const msg = (error?.message ?? '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return { error: 'Ese nombre de usuario ya está en uso. Elige otro.' };
      }
      return { error: 'No se pudo crear la cuenta.' };
    }
    nuevoId = data.user.id;
  } catch {
    return { error: 'No se pudo crear la cuenta: falta configurar el servidor (SUPABASE_SERVICE_ROLE_KEY).' };
  }

  const { error: e2 } = await supabase.rpc('soporte_completar_cuenta', {
    p_id: nuevoId, p_empresa_id: empresaId, p_nombre: nombre, p_email_contacto: correo || null,
  });
  if (e2) return { error: 'La cuenta se creó pero no se pudo asignar a la empresa. Avisa para revisarlo a mano.' };

  revalidatePath('/soporte');
  return { ok: `Cuenta "${usuario}" creada. Entrégale el usuario y esta contraseña temporal: deberá cambiarla al ingresar.` };
}
