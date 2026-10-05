'use client';
import { useMemo, useState } from 'react';
import Link from '@/components/LinkSeguro';
import { ClipboardList, Loader2, MapPin, Phone, Plus, Ruler, Search, Sparkles, User, X } from 'lucide-react';
import { ESTADOS_PEDIDO, ESTADO_PEDIDO_COLOR, etiquetaTipo } from '@/lib/constants';
import { formatoMonto } from '@/lib/format';
import { llamar } from '@/lib/llamar';
import { coincidencias, type PropiedadParaCoincidencia } from '@/lib/pedidos';

export type PedidoItem = {
  id: string; cliente_nombre: string; cliente_telefono: string | null;
  tipo: string; tipo_otro: string | null; ubicacion: string | null; medidas: string | null;
  presupuesto: number | null; moneda: string; descripcion: string | null; estado: string; created_at: string;
};

const ESTADOS_FILTRO: [string, string][] = [['', 'Todos'], ...Object.entries(ESTADOS_PEDIDO)] as [string, string][];
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PanelPedidos({ pedidos, disponibles }: { pedidos: PedidoItem[]; disponibles: PropiedadParaCoincidencia[] }) {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [cambiando, setCambiando] = useState<string | null>(null);
  const texto = sinTildes(q.trim());

  // Cambia el estado de un pedido sin tener que entrar a su ficha: para cuando solo hace falta
  // marcarlo como "en proceso", "cumplido", etc. mientras se mira la lista.
  async function cambiarEstado(id: string, nuevo: string) {
    if (cambiando) return;
    setCambiando(id);
    const res = await llamar('cambiarEstadoPedido', [id, nuevo]);
    if (res.error) { alert(res.error); setCambiando(null); return; }
    window.location.reload();
  }

  const visibles = useMemo(() => pedidos.filter((p) =>
    (!estado || p.estado === estado) &&
    (!texto || sinTildes([p.cliente_nombre, p.ubicacion, p.medidas, p.descripcion, p.tipo_otro].filter(Boolean).join(' ')).includes(texto)),
  ), [pedidos, estado, texto]);

  if (pedidos.length === 0) {
    return (
      <div className="space-y-5">
        <Cabecera />
        <div className="card flex flex-col items-center py-14 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><ClipboardList className="h-5 w-5" /></span>
          <h2 className="mt-4">Aún no hay pedidos registrados</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Anota lo que te pide cada cliente (presupuesto, propiedad, ubicación y medidas) aunque todavía no tengas algo que ofrecerle: el sistema avisa solo cuando una propiedad disponible podría servirle.</p>
          <Link href="/pedidos/nuevo" className="btn mt-5"><Plus className="h-4 w-4" /> Registrar el primer pedido</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Cabecera />

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"><Search className="h-4 w-4" /></span>
        <input className="input !min-h-[3rem] !rounded-2xl !pl-11 !pr-11" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por cliente, zona o descripción…" aria-label="Buscar pedidos" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute inset-y-0 right-3 my-auto flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {ESTADOS_FILTRO.map(([v, l]) => (
          <button key={v} type="button" onClick={() => setEstado(v === estado ? '' : v)} aria-pressed={estado === v} className={`pill shrink-0 ${estado === v ? 'pill-active' : ''}`}>{l}</button>
        ))}
      </div>

      {visibles.length > 0 ? (
        <ul className="space-y-3">
          {visibles.map((p) => {
            const match = coincidencias(p, disponibles);
            return (
              <li key={p.id} className="card !p-4">
                <Link href={`/pedidos/${p.id}`} className="block">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${ESTADO_PEDIDO_COLOR[p.estado]}`}>{ESTADOS_PEDIDO[p.estado as keyof typeof ESTADOS_PEDIDO]}</span>
                      <span className="badge bg-violet-50 text-violet-700 ring-1 ring-violet-200">{etiquetaTipo(p)}</span>
                    </div>
                    {p.presupuesto !== null && <span className="text-sm font-bold text-slate-900">{formatoMonto(p.presupuesto, p.moneda)}</span>}
                  </div>
                  <p className="mt-2.5 flex items-center gap-1.5 font-semibold text-slate-800"><User className="h-4 w-4 shrink-0 text-slate-400" />{p.cliente_nombre}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {p.ubicacion && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.ubicacion}</span>}
                    {p.medidas && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{p.medidas}</span>}
                    {p.cliente_telefono && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.cliente_telefono}</span>}
                  </p>
                  {p.descripcion && <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">{p.descripcion}</p>}
                </Link>
                {(p.estado === 'pendiente' || p.estado === 'en_proceso') && match.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" /> {match.length} propiedad{match.length === 1 ? '' : 'es'} disponible{match.length === 1 ? '' : 's'} podría{match.length === 1 ? '' : 'n'} servirle
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <span className="mr-0.5 text-xs text-slate-400">Cambiar a:</span>
                  {Object.entries(ESTADOS_PEDIDO).filter(([v]) => v !== p.estado).map(([v, l]) => (
                    <button key={v} type="button" disabled={cambiando === p.id} onClick={() => cambiarEstado(p.id, v)}
                      className="pill !px-2.5 !py-1 text-xs disabled:opacity-50">
                      {cambiando === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : l}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="card py-10 text-center text-sm text-slate-500">No hay pedidos con estos filtros.</p>}
    </div>
  );
}

function Cabecera() {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h1>Pedidos</h1>
        <p className="text-sm text-slate-500">Lo que piden tus clientes, tengas o no la propiedad cargada todavía.</p>
      </div>
      <Link href="/pedidos/nuevo" className="btn hidden sm:inline-flex"><Plus className="h-4 w-4" /> Nuevo pedido</Link>
    </div>
  );
}
