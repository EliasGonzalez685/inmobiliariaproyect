import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  cargarOperaciones, cargarPropiedades, excelOperaciones, excelPropiedades, nombreArchivo, pdfOperaciones, pdfPropiedades,
} from '@/lib/exportar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPOS = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

/** Descarga de listados: /api/exportar/propiedades?formato=xlsx|pdf y /api/exportar/operaciones?formato=xlsx|pdf */
export async function GET(req: NextRequest, { params }: { params: Promise<{ recurso: string }> }) {
  const { recurso } = await params;
  const formato = req.nextUrl.searchParams.get('formato');
  if ((recurso !== 'propiedades' && recurso !== 'operaciones') || (formato !== 'xlsx' && formato !== 'pdf')) {
    return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 });
  const { data: perfil } = await supabase.from('profiles').select('rol, activo').eq('id', uid).single();
  if (!perfil?.activo || perfil.rol === 'super_admin') return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  try {
    let cuerpo: Buffer;
    if (recurso === 'propiedades') {
      const filas = await cargarPropiedades(supabase);
      cuerpo = formato === 'xlsx' ? await excelPropiedades(filas) : pdfPropiedades(filas);
    } else {
      const filas = await cargarOperaciones(supabase);
      cuerpo = formato === 'xlsx' ? await excelOperaciones(filas) : pdfOperaciones(filas);
    }
    return new NextResponse(new Uint8Array(cuerpo), {
      headers: {
        'Content-Type': TIPOS[formato],
        'Content-Disposition': `attachment; filename="${nombreArchivo(recurso, formato)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[exportar]', e);
    return NextResponse.json({ error: 'No se pudo generar el archivo' }, { status: 500 });
  }
}
