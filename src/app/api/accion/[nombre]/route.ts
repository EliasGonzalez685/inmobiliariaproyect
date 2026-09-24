import { NextResponse, type NextRequest } from 'next/server';
import { REGISTRO } from '@/lib/acciones-registro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (cuerpo: unknown, status = 200) => NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Ejecuta una acción de guardado/eliminación pedida por el navegador con un fetch normal.
 * Evita la cola interna del enrutador de Next.js (que era lo que dejaba la pantalla "cargando").
 * Requiere sesión (el middleware ya lo exige) y misma procedencia (origin).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  const accion = Object.prototype.hasOwnProperty.call(REGISTRO, nombre) ? REGISTRO[nombre] : null;
  if (!accion) return json({ error: 'Acción no válida.' }, 404);

  const origen = req.headers.get('origin');
  if (origen) {
    let host = '';
    try { host = new URL(origen).host; } catch { /* origen inválido */ }
    if (host !== req.headers.get('host')) return json({ error: 'Petición no permitida.' }, 403);
  }

  let fd: FormData;
  try { fd = await req.formData(); } catch { return json({ error: 'Petición no válida.' }, 400); }
  let args: unknown[] = [];
  try {
    const v = JSON.parse(String(fd.get('__args') ?? '[]'));
    if (Array.isArray(v)) args = v;
  } catch { /* sin argumentos */ }
  fd.delete('__args');

  const inicio = Date.now();
  try {
    const resultado = await accion(args, fd);
    console.log(`[accion] ${nombre} ${Date.now() - inicio} ms`);
    return json(resultado ?? {});
  } catch (e) {
    // Las acciones usan redirect('/login') cuando la sesión no vale: se traduce a una orden de ir a esa dirección.
    const digest = String((e as { digest?: string })?.digest ?? '');
    if (digest.startsWith('NEXT_REDIRECT')) return json({ ir: digest.split(';')[2] || '/login' });
    console.error(`[accion] ${nombre} falló:`, (e as Error)?.message ?? e);
    return json({ error: 'No se pudo completar la acción. Inténtalo de nuevo.' }, 500);
  }
}
