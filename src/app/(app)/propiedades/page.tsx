import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ListaPropiedades, { type PropiedadItem } from './ListaPropiedades';

export const dynamic = 'force-dynamic';

export default async function Propiedades({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; tipo?: string }> }) {
  const { q = '', estado = '', tipo = '' } = await searchParams;
  // La cuenta, las propiedades y sus fotos se consultan a la vez (antes eran tres esperas seguidas).
  const supabase = await createClient();
  // Se cargan todas una sola vez; los filtros y la búsqueda se aplican al instante en el navegador.
  const [, { data }, { data: fotos }] = await Promise.all([
    requireProfile(),
    supabase.from('propiedades')
      .select('id, codigo, titulo, tipo, tipo_otro, estado, estado_otro, direccion, barrio, ciudad, precio, moneda, superficie_terreno, superficie_construida, dormitorios, banos, cocheras, clientes(nombre)')
      .order('created_at', { ascending: false }),
    // Foto de portada (o la más reciente) y cantidad de fotos y videos de cada propiedad
    supabase.from('propiedad_fotos')
      .select('propiedad_id, storage_path, es_portada, fecha_toma, tipo_media')
      .order('es_portada', { ascending: false }).order('fecha_toma', { ascending: false }),
  ]);
  const filas = data ?? [];
  const ids = new Set(filas.map((p) => p.id));

  const portadas: Record<string, string> = {};
  const cantidad: Record<string, number> = {};
  if (ids.size) {
    const elegidas: Record<string, string> = {};
    fotos?.filter((f) => ids.has(f.propiedad_id)).forEach((f) => {
      cantidad[f.propiedad_id] = (cantidad[f.propiedad_id] ?? 0) + 1;
      // La portada siempre es una foto (nunca un video)
      if (f.tipo_media === 'foto' && !elegidas[f.propiedad_id]) elegidas[f.propiedad_id] = f.storage_path;
    });
    const paths = Object.values(elegidas);
    if (paths.length) {
      const { data: urls } = await supabase.storage.from('fotos').createSignedUrls(paths, 3600);
      const porRuta = new Map(urls?.map((u) => [u.path, u.signedUrl]) ?? []);
      for (const [pid, ruta] of Object.entries(elegidas)) {
        const url = porRuta.get(ruta);
        if (url) portadas[pid] = url;
      }
    }
  }

  const propiedades: PropiedadItem[] = filas.map((p) => ({
    id: p.id, codigo: p.codigo, titulo: p.titulo, tipo: p.tipo, tipo_otro: p.tipo_otro, estado: p.estado, estado_otro: p.estado_otro,
    direccion: p.direccion, barrio: p.barrio, ciudad: p.ciudad,
    precio: p.precio === null ? null : Number(p.precio), moneda: p.moneda,
    superficie_terreno: p.superficie_terreno === null ? null : Number(p.superficie_terreno),
    superficie_construida: p.superficie_construida === null ? null : Number(p.superficie_construida),
    dormitorios: p.dormitorios, banos: p.banos, cocheras: p.cocheras,
    cliente: (p.clientes as unknown as { nombre: string } | null)?.nombre ?? null,
    portada: portadas[p.id] ?? null, cantidad: cantidad[p.id] ?? 0,
  }));

  return <ListaPropiedades propiedades={propiedades} inicial={{ q, estado, tipo }} />;
}
