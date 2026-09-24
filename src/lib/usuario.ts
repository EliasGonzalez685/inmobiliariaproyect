// Cada persona ingresa con un "usuario" (letras, números, punto, guion o guion bajo) o con su correo de contacto.
// Internamente Supabase Auth identifica la cuenta con un correo interno (usuario@inmobiliariaproyect.app) que
// nunca cambia; el ingreso se resuelve con la función SQL resolver_login().
export const DOMINIO_USUARIOS = 'inmobiliariaproyect.app';

export const USUARIO_REGEX = /^[a-z0-9._-]{3,30}$/;
export const CORREO_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const CLAVE_MINIMA = 8;

export const MENSAJE_USUARIO = 'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo (sin espacios ni @).';

export function normalizar(v: FormDataEntryValue | null | undefined) {
  return String(v ?? '').trim().toLowerCase();
}

/** Devuelve un mensaje de error si los datos no son válidos; null si están bien. */
export function validarUsuarioYCorreo(usuario: string, correo: string): string | null {
  if (!USUARIO_REGEX.test(usuario)) return MENSAJE_USUARIO;
  if (correo) {
    if (!CORREO_REGEX.test(correo)) return 'El correo no tiene un formato válido.';
    if (correo.endsWith(`@${DOMINIO_USUARIOS}`)) return `Usa tu correo personal; @${DOMINIO_USUARIOS} está reservado para el sistema.`;
  }
  return null;
}

/** Traduce errores de restricciones únicas de la base de datos. */
export function errorDeDuplicado(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;
  if (error.code === '23505') {
    return (error.message ?? '').includes('email_contacto')
      ? 'Ese correo ya está en uso por otra cuenta.'
      : 'Ese nombre de usuario ya está en uso. Elige otro.';
  }
  if (error.code === '23514') return 'Revisa el formato del usuario o del correo.';
  return null;
}
