// Subida de fotos y videos de una propiedad (se ejecuta en el navegador, directo a Supabase Storage).
import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_VIDEO_MB = 50;
export const MAX_FOTO_MB = 15;

const TIPOS_VIDEO: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp' };

export const limpiarNombre = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_');

export function esVideo(file: { type: string; name: string }) {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext in TIPOS_VIDEO;
}

function esImagen(file: { type: string; name: string }) {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name);
}

const mb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

// Reduce fotos del celular (lado mayor 1920px) para subir más rápido y ahorrar espacio
export async function reducirImagen(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    if (escala === 1 && file.size < 2_000_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export type EstadoArchivo = { estado: 'esperando' | 'subiendo' | 'listo' | 'error'; progreso: number; mensaje?: string };

function mensajeDeError(texto: string, status: number) {
  try {
    const j = JSON.parse(texto) as { message?: string; error?: string };
    return j.message || j.error || `Error ${status}`;
  } catch {
    return texto?.slice(0, 200) || `Error ${status}`;
  }
}

/**
 * Sube un archivo a Storage informando el avance real (0-100). Usa la misma petición que la biblioteca de Supabase
 * (multipart) pero con XMLHttpRequest para poder medir cuánto se envió. Si la conexión directa falla, reintenta sin medición.
 */
async function subirConProgreso(supabase: SupabaseClient, path: string, file: File, contentType: string, alProgreso: (pct: number) => void): Promise<{ error?: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const sinMedicion = async () => {
    const { error } = await supabase.storage.from('fotos').upload(path, file, { contentType });
    return error ? { error: error.message } : {};
  };
  if (!base || !anon || !token) return sinMedicion();

  const parte = file.type ? file : new File([file], file.name, { type: contentType });
  const resultado = await new Promise<{ error?: string; red?: boolean }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/storage/v1/object/fotos/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', anon);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.timeout = 15 * 60 * 1000;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) alProgreso(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? {} : { error: mensajeDeError(xhr.responseText, xhr.status) });
    xhr.onerror = () => resolve({ error: 'No se pudo conectar con el servidor.', red: true });
    xhr.ontimeout = () => resolve({ error: 'La subida tardó demasiado. Revisa tu conexión.' });
    const cuerpo = new FormData();
    cuerpo.append('cacheControl', '3600');
    cuerpo.append('', parte);
    xhr.send(cuerpo);
  });
  if (resultado.red) return sinMedicion();
  if (!resultado.error) alProgreso(100);
  return resultado;
}

export type DatosMedia = { categoria: string; fecha_toma: string; descripcion?: string | null };

/**
 * Sube fotos y videos a la propiedad. Sigue con el resto si alguno falla y devuelve los errores.
 * La primera foto se marca como portada si la propiedad todavía no tiene una.
 */
export async function subirMedia(
  supabase: SupabaseClient,
  propiedadId: string,
  archivos: File[],
  datos: DatosMedia,
  opciones: { yaTienePortada: boolean; alAvanzar?: (hecho: number, total: number) => void; alArchivo?: (indice: number, estado: EstadoArchivo) => void },
) {
  const errores: string[] = [];
  let subidos = 0;
  let portadaPendiente = !opciones.yaTienePortada;

  for (const [i, original] of archivos.entries()) {
    opciones.alAvanzar?.(i, archivos.length);
    const fallar = (mensaje: string) => {
      errores.push(`${original.name}: ${mensaje}`);
      opciones.alArchivo?.(i, { estado: 'error', progreso: 0, mensaje });
    };
    opciones.alArchivo?.(i, { estado: 'subiendo', progreso: 0 });
    const video = esVideo(original);
    if (!video && !esImagen(original)) { fallar('solo se aceptan fotos y videos.'); continue; }
    if (video && original.size > MAX_VIDEO_MB * 1024 * 1024) {
      fallar(`el video pesa ${mb(original.size)} MB y el máximo es ${MAX_VIDEO_MB} MB. Recórtalo o comprímelo.`);
      continue;
    }

    const file = video ? original : await reducirImagen(original);
    if (!video && file.size > MAX_FOTO_MB * 1024 * 1024) { fallar(`la foto supera ${MAX_FOTO_MB} MB.`); continue; }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const contentType = file.type || TIPOS_VIDEO[ext] || 'application/octet-stream';
    const path = `${propiedadId}/${crypto.randomUUID()}-${limpiarNombre(file.name)}`;

    const { error: e1 } = await subirConProgreso(supabase, path, file, contentType, (pct) => opciones.alArchivo?.(i, { estado: 'subiendo', progreso: pct }));
    if (e1) {
      const grande = /maximum allowed size|exceeded|too large|413/i.test(e1);
      fallar(grande ? 'supera el tamaño máximo permitido por el servidor' : e1);
      continue;
    }
    const { error: e2 } = await supabase.from('propiedad_fotos').insert({
      propiedad_id: propiedadId,
      storage_path: path,
      tipo_media: video ? 'video' : 'foto',
      categoria: datos.categoria,
      fecha_toma: datos.fecha_toma,
      descripcion: datos.descripcion?.trim() || null,
      es_portada: !video && portadaPendiente,
    });
    if (e2) {
      await supabase.storage.from('fotos').remove([path]);
      fallar(e2.message);
      continue;
    }
    if (!video) portadaPendiente = false;
    subidos++;
    opciones.alArchivo?.(i, { estado: 'listo', progreso: 100 });
  }
  opciones.alAvanzar?.(archivos.length, archivos.length);
  return { subidos, errores };
}
