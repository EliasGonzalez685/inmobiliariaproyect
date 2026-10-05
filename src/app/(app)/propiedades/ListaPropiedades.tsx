'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/LinkSeguro';
import { Bath, BedDouble, Camera, Car, ChevronLeft, ChevronRight, MapPin, Plus, Ruler, Search, X } from 'lucide-react';
import Placeholder from '@/components/Placeholder';
import BotonesExportar from '@/components/BotonesExportar';
import { ESTADO_COLOR, TIPOS_PROPIEDAD, etiquetaEstado, etiquetaTipo } from '@/lib/constants';
import { formatoMonto, formatoSuperficie } from '@/lib/format';

export type PropiedadItem = {
  id: string; codigo: string | null; titulo: string; tipo: string; tipo_otro: string | null; estado: string; estado_otro: string | null;
  direccion: string | null; barrio: string | null; ciudad: string | null; precio: number | null; moneda: string;
  superficie_terreno: number | null; superficie_construida: number | null; dormitorios: number | null; banos: number | null; cocheras: number | null;
  cliente: string | null; portada: string | null; cantidad: number;
};

const ESTADOS_FILTRO: [string, string][] = [
  ['', 'Todas'], ['disponible', 'Disponibles'], ['alquilada', 'Alquiladas'], ['ocupada', 'Ocupadas'],
  ['reservada', 'Reservadas'], ['en_mantenimiento', 'Mantenimiento'], ['vendida', 'Vendidas'], ['otro', 'Otros'],
];

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Dato({ icon: Icon, valor }: { icon: typeof Ruler; valor: string | number | null }) {
  if (!valor) return null;
  return <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><Icon className="h-3.5 w-3.5 text-slate-400" />{valor}</span>;
}

/** Una fila de opciones con flechas a los costados para desplazarse. */
function FilaOpciones({ opciones, valor, alElegir, etiqueta }: {
  opciones: [string, string][]; valor: string; alElegir: (v: string) => void; etiqueta: string;
}) {
  const carril = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

  const medir = () => {
    const el = carril.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 4);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const mover = (dir: 1 | -1) => carril.current?.scrollBy({ left: dir * Math.max(200, (carril.current?.clientWidth ?? 400) * 0.7), behavior: 'smooth' });
  const boton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:text-brand-600 active:scale-95 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="flex items-center gap-2" role="group" aria-label={etiqueta}>
      <button type="button" onClick={() => mover(-1)} disabled={!puedeIzq} aria-label="Ver opciones anteriores" className={boton}><ChevronLeft className="h-5 w-5" /></button>
      <div ref={carril} onScroll={medir} className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth px-0.5 py-1">
        {opciones.map(([v, l]) => (
          <button key={v} type="button" onClick={() => alElegir(v)} aria-pressed={valor === v} className={`pill shrink-0 ${valor === v ? 'pill-active' : ''}`}>{l}</button>
        ))}
      </div>
      <button type="button" onClick={() => mover(1)} disabled={!puedeDer} aria-label="Ver más opciones" className={boton}><ChevronRight className="h-5 w-5" /></button>
    </div>
  );
}

/** Dos filas, una debajo de la otra: estado y tipo. */
function FilaFiltros({ estados, tipos, estado, tipo, alElegirEstado, alElegirTipo }: {
  estados: [string, string][]; tipos: [string, string][]; estado: string; tipo: string;
  alElegirEstado: (v: string) => void; alElegirTipo: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <FilaOpciones opciones={estados} valor={estado} alElegir={alElegirEstado} etiqueta="Filtrar por estado" />
      <FilaOpciones opciones={tipos} valor={tipo} alElegir={alElegirTipo} etiqueta="Filtrar por tipo" />
    </div>
  );
}

export default function ListaPropiedades({ propiedades, inicial }: { propiedades: PropiedadItem[]; inicial: { q: string; estado: string; tipo: string } }) {
  const [q, setQ] = useState(inicial.q);
  const [estado, setEstado] = useState(inicial.estado);
  const [tipo, setTipo] = useState(inicial.tipo);

  // Mantiene la dirección del navegador al día sin recargar la página.
  // Se pasa el estado actual del historial para que Next.js no lo trate como una navegación
  // (de lo contrario, cada filtro volvía a precargar todas las fichas y trababa el sistema).
  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (estado) p.set('estado', estado);
    if (tipo) p.set('tipo', tipo);
    const s = p.toString();
    window.history.replaceState(window.history.state, '', s ? `/propiedades?${s}` : '/propiedades');
  }, [q, estado, tipo]);

  const texto = useMemo(() => sinTildes(q.trim()), [q]);
  const coincideTexto = (p: PropiedadItem) =>
    !texto || sinTildes([p.titulo, p.codigo, p.direccion, p.barrio, p.ciudad, p.cliente, p.tipo_otro, p.estado_otro].filter(Boolean).join(' ')).includes(texto);

  const visibles = useMemo(
    () => propiedades.filter((p) => (!estado || p.estado === estado) && (!tipo || p.tipo === tipo) && coincideTexto(p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propiedades, texto, estado, tipo],
  );

  const hayFiltros = !!(q.trim() || estado || tipo);
  const opcionesEstado = ESTADOS_FILTRO;
  const opcionesTipo: [string, string][] = Object.entries(TIPOS_PROPIEDAD).map(([v, l]) => [v, l] as [string, string]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1>Propiedades</h1>
          <p className="text-sm text-slate-500">
            {visibles.length} {visibles.length === 1 ? 'propiedad' : 'propiedades'}
            {hayFiltros && propiedades.length !== visibles.length && <> de {propiedades.length}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonesExportar recurso="propiedades" />
          <Link href="/propiedades/nueva" className="btn hidden sm:inline-flex"><Plus className="h-4 w-4" /> Nueva propiedad</Link>
        </div>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"><Search className="h-4 w-4" /></span>
        <input className="input !min-h-[3rem] !rounded-2xl !pl-11 !pr-11" value={q} onChange={(e) => setQ(e.target.value)} type="search"
          placeholder="Buscar propiedad, barrio, propietario…" aria-label="Buscar propiedades" />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute inset-y-0 right-3 my-auto flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <FilaFiltros estados={opcionesEstado} tipos={opcionesTipo} estado={estado} tipo={tipo}
        alElegirEstado={(v) => setEstado(v === estado ? '' : v)} alElegirTipo={(v) => setTipo(v === tipo ? '' : v)} />

      {visibles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((p) => {
            const m2 = p.superficie_terreno || p.superficie_construida;
            return (
              <Link key={p.id} href={`/propiedades/${p.id}`} prefetch={false} className="card card-hover group block overflow-hidden !p-0">
                <div className="relative h-48 overflow-hidden">
                  <div className="h-full w-full transition duration-500 group-hover:scale-105">
                    {p.portada
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.portada} alt={p.titulo} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                      : <Placeholder seed={p.id} />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                  <span className={`badge badge-dot absolute left-3 top-3 !bg-white/95 backdrop-blur ${(ESTADO_COLOR[p.estado] ?? '').split(' ')[1]}`}>{etiquetaEstado(p)}</span>
                  {p.precio && <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-2.5 py-1 text-sm font-bold text-slate-900 shadow-soft">{formatoMonto(p.precio, p.moneda)}</span>}
                  {!!p.cantidad && <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur"><Camera className="h-3 w-3" /> {p.cantidad}</span>}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">{p.codigo ? `${p.codigo} · ` : ''}{etiquetaTipo(p)}</p>
                    <h2 className="mt-0.5 line-clamp-1 text-lg">{p.titulo}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{[p.direccion, p.ciudad].filter(Boolean).join(', ') || 'Sin dirección'}</span></p>
                  </div>
                  <div className="flex min-h-[1.75rem] flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
                    <Dato icon={Ruler} valor={formatoSuperficie(m2)} />
                    <Dato icon={BedDouble} valor={p.dormitorios} />
                    <Dato icon={Bath} valor={p.banos} />
                    <Dato icon={Car} valor={p.cocheras} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center py-14 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><Search className="h-5 w-5" /></span>
          <h2 className="mt-4">{propiedades.length ? 'Sin resultados' : 'Aún no hay propiedades'}</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">{propiedades.length ? 'Prueba con otros filtros o una búsqueda distinta.' : 'Registra la primera propiedad para empezar a gestionar tu patrimonio.'}</p>
          {propiedades.length
            ? <button type="button" onClick={() => { setQ(''); setEstado(''); setTipo(''); }} className="btn-secondary mt-5"><X className="h-4 w-4" /> Quitar filtros</button>
            : <Link href="/propiedades/nueva" className="btn mt-5"><Plus className="h-4 w-4" /> Nueva propiedad</Link>}
        </div>
      )}
    </div>
  );
}
