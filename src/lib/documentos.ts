// Subida de documentos de una propiedad (se ejecuta en el navegador, directo a Supabase Storage).
// Se usa al crear una propiedad, cuando todavía no se puede ir a su pestaña "Documentos" porque no tiene id.
import type { SupabaseClient } from '@supabase/supabase-js';
import { limpiarNombre } from './media';

export const MAX_DOCUMENTO_MB = 25;

export type EstadoArchivo = { estado: 'esperando' | 'subiendo' | 'listo' | 'error'; progreso: number; mensaje?: string };

/**
 * Sube documentos a la propiedad. Sigue con el resto si alguno falla y devuelve los errores.
 * Todos los archivos de una tanda quedan con el mismo "tipo"; el nombre que muestra es el del archivo
 * (igual que al dejar vacío el campo "Nombre" al subir un documento desde la ficha de la propiedad).
 */
export async function subirDocumentos(
  supabase: SupabaseClient,
  propiedadId: string,
  archivos: File[],
  tipo: string,
  opciones: { alAvanzar?: (hecho: number, total: number) => void; alArchivo?: (indice: number, estado: EstadoArchivo) => void },
) {
  const errores: string[] = [];
  let subidos = 0;

  for (const [i, file] of archivos.entries()) {
    opciones.alAvanzar?.(i, archivos.length);
    const fallar = (mensaje: string) => {
      errores.push(`${file.name}: ${mensaje}`);
      opciones.alArchivo?.(i, { estado: 'error', progreso: 0, mensaje });
    };
    opciones.alArchivo?.(i, { estado: 'subiendo', progreso: 30 });
    if (file.size > MAX_DOCUMENTO_MB * 1024 * 1024) { fallar(`pesa más de ${MAX_DOCUMENTO_MB} MB.`); continue; }

    const path = `${propiedadId}/${crypto.randomUUID()}-${limpiarNombre(file.name)}`;
    const { error: e1 } = await supabase.storage.from('documentos').upload(path, file, { contentType: file.type || undefined });
    if (e1) { fallar(e1.message); continue; }

    const { error: e2 } = await supabase.from('propiedad_documentos').insert({
      propiedad_id: propiedadId,
      storage_path: path,
      tipo,
      nombre: file.name,
    });
    if (e2) {
      await supabase.storage.from('documentos').remove([path]);
      fallar(e2.message);
      continue;
    }
    subidos++;
    opciones.alArchivo?.(i, { estado: 'listo', progreso: 100 });
  }
  opciones.alAvanzar?.(archivos.length, archivos.length);
  return { subidos, errores };
}
