import { Suspense } from 'react';
import Link from '@/components/LinkSeguro';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bath, BedDouble, Building, Calendar, ChevronRight, Landmark, MapPin, Pencil, Phone, Mail, Ruler, Trash2, User } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ConfirmForm from '@/components/ConfirmForm';
import Placeholder from '@/components/Placeholder';
import FotosManager from '@/components/FotosManager';
import DocumentosManager from '@/components/DocumentosManager';
import { ESTADO_COLOR, OPERACIONES, etiquetaEstado, etiquetaTipo } from '@/lib/constants';
import { formatoMonto, formatoSuperficie } from '@/lib/format';
import MantenimientoTab from './MantenimientoTab';
import OperacionesTab from './OperacionesTab';
import EstadoRapido from './EstadoRapido';
import Pestanas from './Pestanas';

export const dynamic = 'force-dynamic';

type Icono = typeof Ruler;

export default async function Propiedad({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; nueva?: string }> }) {
  const { id } = await params;
  const { tab = 'ficha', nueva } = await searchParams;
  const supabase = await createClient();

  const contar = (tabla: string) => supabase.from(tabla).select('id', { count: 'exact', head: true }).eq('propiedad_id', id);
  const [, { data: p }, { data: portada }, cFotos, cDocs, cMant, cOper] = await Promise.all([
    requireProfile(),
    supabase.from('propiedades').select('*, clientes(id, nombre, telefono, email)').eq('id', id).single(),
    supabase.from('propiedad_fotos').select('storage_path').eq('propiedad_id', id).eq('tipo_media', 'foto').order('es_portada', { ascending: false }).order('fecha_toma', { ascending: false }).limit(1),
    contar('propiedad_fotos'), contar('propiedad_documentos'), contar('mantenimientos'), contar('operaciones'),
  ]);
  if (!p) notFound();

  let portadaUrl: string | null = null;
  if (portada?.[0]) {
    const { data } = await supabase.storage.from('fotos').createSignedUrl(portada[0].storage_path, 3600);
    portadaUrl = data?.signedUrl ?? null;
  }
  const cliente = p.clientes as { id: string; nombre: string; telefono: string | null; email: string | null } | null;

  const resumen: [Icono, string, string][] = [
    [Ruler, 'Terreno', formatoSuperficie(p.superficie_terreno) ?? '—'],
    [Building, 'Construido', p.superficie_construida ? `${Number(p.superficie_construida).toLocaleString('es-PY')} m²` : '—'],
    [BedDouble, 'Dormitorios', p.dormitorios ?? '—'],
    [Bath, 'Baños', p.banos ?? '—'],
  ];

  const ficha = (
        <div className="grid gap-4 lg:grid-cols-2">
        <Caja icon={MapPin} titulo="Ubicación" filas={[['Dirección', p.direccion], ['Barrio', p.barrio], ['Ciudad', p.ciudad], ['Departamento', p.departamento]]}>
          {p.latitud && p.longitud && (
            <a className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline" target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps?q=${p.latitud},${p.longitud}`}>Ver en el mapa <ChevronRight className="h-4 w-4" /></a>
          )}
        </Caja>

        <section className="card">
          <div className="mb-3 flex items-center gap-3"><span className="icon-chip !h-9 !w-9 bg-violet-50 text-violet-600"><User className="h-[18px] w-[18px]" /></span><h2>Propietario / cliente</h2></div>
          {cliente ? (
            <>
              <Link href={`/clientes/${cliente.id}`} className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-violet-500 font-bold text-white">{cliente.nombre[0]}</span>
                <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{cliente.nombre}</p><p className="text-xs text-slate-500">{OPERACIONES[p.operacion as keyof typeof OPERACIONES]}</p></div>
              </Link>
              <div className="space-y-2">
                <Dato icon={Phone} etiqueta="Teléfono" valor={cliente.telefono} href={cliente.telefono ? `tel:${cliente.telefono.replace(/\s+/g, '')}` : undefined} clienteId={cliente.id} />
                <Dato icon={Mail} etiqueta="Correo" valor={cliente.email} href={cliente.email ? `mailto:${cliente.email}` : undefined} clienteId={cliente.id} />
              </div>
            </>
          ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Esta propiedad no tiene propietario asignado. Puedes asignarlo desde <Link href={`/propiedades/${id}/editar`} className="font-semibold text-brand-600">Editar</Link>.</p>}
        </section>

        <Caja icon={Ruler} tono="bg-sky-50 text-sky-600" titulo="Datos técnicos" filas={[
          ['Tipo', etiquetaTipo(p)],
          ['Superficie terreno', formatoSuperficie(p.superficie_terreno)],
          ['Superficie construida', p.superficie_construida ? `${p.superficie_construida} m²` : null],
          ['Medidas', p.medidas], ['Cocheras', p.cocheras], ['Año de construcción', p.anio_construccion],
          ['Servicios', p.servicios?.join(', ')], ['Linderos', p.linderos], ['Mejoras', p.mejoras],
        ]} />

        <Caja icon={Landmark} tono="bg-emerald-50 text-emerald-600" titulo="Datos legales y valor" filas={[
          ['Finca N°', p.finca_nro], ['Padrón N°', p.padron_nro], ['Lote N°', p.lote_nro], ['Manzana N°', p.manzana_nro],
          ['Cta. Cte. Catastral', p.cuenta_corriente_catastral], ['Información adicional', p.informacion_adicional],
          ['Precio / valor', p.precio ? formatoMonto(p.precio, p.moneda) : null], ['Notas', p.notas],
        ]} />
      </div>
  );

  return (
    <div className="space-y-5">
      <Link href="/propiedades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Propiedades</Link>

      <section className="relative overflow-hidden rounded-3xl shadow-lift">
        <div className="h-56 sm:h-72">
          {portadaUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={portadaUrl} alt={p.titulo} className="h-full w-full object-cover" />
            : <Placeholder seed={p.id} />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="text-white">
            <span className={`badge badge-dot ${ESTADO_COLOR[p.estado]} !bg-white/95`}>{etiquetaEstado(p)}</span>
            <h1 className="mt-2 !text-2xl !text-white sm:!text-3xl">{p.titulo}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{[p.direccion, p.ciudad].filter(Boolean).join(', ') || 'Sin dirección'}{p.codigo ? ` · ${p.codigo}` : ''}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/propiedades/${id}/editar`} className="btn-secondary btn-sm !bg-white/95"><Pencil className="h-4 w-4" /> Editar</Link>
            <ConfirmForm accion="eliminarPropiedad" args={[id]} mensaje="¿Eliminar esta propiedad con todas sus fotos, videos, documentos e historial? No se puede deshacer." className="btn-danger btn-sm !bg-white/95" label="Eliminar propiedad">
              <Trash2 className="h-4 w-4" /> Eliminar
            </ConfirmForm>
          </div>
        </div>
      </section>

      <EstadoRapido id={id} estado={p.estado} estadoOtro={p.estado_otro} nuevaOperacion={nueva} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {resumen.map(([Icon, l, v]) => (
          <div key={l} className="card flex items-center gap-3 !p-3.5">
            <span className="icon-chip !h-9 !w-9 bg-slate-100 text-slate-600"><Icon className="h-[18px] w-[18px]" /></span>
            <div><p className="text-[11px] font-semibold text-slate-500">{l}</p><p className="font-bold text-slate-900">{v}</p></div>
          </div>
        ))}
      </div>

      <Pestanas
        inicial={tab}
        tabs={[
          { k: 'ficha', l: 'Ficha', n: null, contenido: ficha },
          { k: 'fotos', l: 'Fotos y videos', n: cFotos.count, contenido: <Suspense fallback={<Cargando />}><FotosTab id={id} /></Suspense> },
          { k: 'documentos', l: 'Documentos', n: cDocs.count, contenido: <Suspense fallback={<Cargando />}><DocumentosTab id={id} /></Suspense> },
          { k: 'mantenimiento', l: 'Mantenimiento', n: cMant.count, contenido: <Suspense fallback={<Cargando />}><MantenimientoTab propiedadId={id} /></Suspense> },
          { k: 'operaciones', l: 'Operaciones', n: cOper.count, contenido: <Suspense fallback={<Cargando />}><OperacionesTab propiedadId={id} /></Suspense> },
        ]}
      />
    </div>
  );
}

function Caja({ icon: Icon, titulo, filas, children, tono = 'bg-brand-50 text-brand-600' }: { icon: Icono; titulo: string; filas: [string, unknown][]; children?: React.ReactNode; tono?: string }) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center gap-3"><span className={`icon-chip !h-9 !w-9 ${tono}`}><Icon className="h-[18px] w-[18px]" /></span><h2>{titulo}</h2></div>
      <dl className="divide-y divide-slate-100 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className="whitespace-pre-line text-right font-medium text-slate-800">{v === null || v === undefined || v === '' ? '—' : String(v)}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

async function FotosTab({ id }: { id: string }) {
  const { supabase } = await requireProfile();
  const { data: fotos } = await supabase.from('propiedad_fotos').select('*').eq('propiedad_id', id).order('fecha_toma', { ascending: false }).order('created_at', { ascending: false });
  const paths = (fotos ?? []).map((f) => f.storage_path);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from('fotos').createSignedUrls(paths, 3600);
    data?.forEach((u) => { if (u.path && u.signedUrl) urls[u.path] = u.signedUrl; });
  }
  return <FotosManager propiedadId={id} fotos={(fotos ?? []).map((f) => ({ ...f, url: urls[f.storage_path] ?? null }))} />;
}

async function DocumentosTab({ id }: { id: string }) {
  const { supabase } = await requireProfile();
  const { data: docs } = await supabase.from('propiedad_documentos').select('*').eq('propiedad_id', id).order('created_at', { ascending: false });
  const urls: Record<string, string> = {};
  if (docs?.length) {
    const { data } = await supabase.storage.from('documentos').createSignedUrls(docs.map((d) => d.storage_path), 3600);
    data?.forEach((u) => { if (u.path && u.signedUrl) urls[u.path] = u.signedUrl; });
  }
  return <DocumentosManager propiedadId={id} documentos={(docs ?? []).map((d) => ({ ...d, url: urls[d.storage_path] ?? null }))} />;
}

function Cargando() {
  return <div className="space-y-3" aria-busy="true"><div className="skeleton h-24 w-full" /><div className="skeleton h-24 w-full" /></div>;
}

/** Dato de contacto visible en la ficha (teléfono / correo): se ve el valor y, si falta, se indica dónde cargarlo. */
function Dato({ icon: Icon, etiqueta, valor, href, clienteId }: { icon: Icono; etiqueta: string; valor: string | null; href?: string; clienteId: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</p>
        {valor
          ? <a href={href} className="block break-all text-sm font-semibold text-slate-800 hover:text-brand-700">{valor}</a>
          : <Link href={`/clientes/${clienteId}`} className="text-sm font-medium text-slate-400 hover:text-brand-600">Sin cargar · agregar en el cliente</Link>}
      </div>
    </div>
  );
}
