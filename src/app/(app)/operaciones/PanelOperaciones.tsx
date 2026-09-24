'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/LinkSeguro';
import { Banknote, CalendarRange, ChevronLeft, CircleAlert, ChevronRight, Handshake, Pencil, Percent, Plus, Search, Trash2, TrendingUp, User, X } from 'lucide-react';
import ConfirmForm from '@/components/ConfirmForm';
import BotonesExportar from '@/components/BotonesExportar';
import { ESTADOS_OPERACION, ESTADO_OPERACION_COLOR, OPERACION_COLOR, OPERACION_HEX, TIPOS_OPERACION, etiquetaOperacion } from '@/lib/constants';
import { formatoFecha, formatoMonto, formatoMontoCompacto } from '@/lib/format';

export type OperacionItem = {
  id: string; propiedad_id: string | null; propiedad: string | null; tipo: string; tipo_otro: string | null; estado: string; fecha: string;
  monto: number | null; moneda: string; comision: number | null; cliente: string | null; fecha_inicio: string | null; fecha_fin: string | null;
  forma_pago: string | null; notas: string | null;
};

const PERIODOS: [string, string][] = [['todo', 'Todo'], ['mes', 'Este mes'], ['3m', 'Últimos 3 meses'], ['anio', 'Este año'], ['anio_ant', 'Año pasado']];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const pad = (n: number) => String(n).padStart(2, '0');
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const suma = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);

function limites(periodo: string, hoy: string): [string, string] {
  const y = Number(hoy.slice(0, 4));
  const m = Number(hoy.slice(5, 7));
  if (periodo === 'mes') return [`${y}-${pad(m)}-01`, '9999-12-31'];
  if (periodo === '3m') { const d = new Date(Date.UTC(y, m - 3, 1)); return [`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`, '9999-12-31']; }
  if (periodo === 'anio') return [`${y}-01-01`, '9999-12-31'];
  if (periodo === 'anio_ant') return [`${y - 1}-01-01`, `${y - 1}-12-31`];
  return ['0000-01-01', '9999-12-31'];
}

/** Fila de filtros con flechas para desplazarse. */
function FilaScroll({ grupos }: { grupos: { valor: string; opciones: [string, string][]; alElegir: (v: string) => void }[] }) {
  const carril = useRef<HTMLDivElement>(null);
  const [izq, setIzq] = useState(false);
  const [der, setDer] = useState(false);
  const medir = () => {
    const el = carril.current;
    if (!el) return;
    setIzq(el.scrollLeft > 4);
    setDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => { medir(); window.addEventListener('resize', medir); return () => window.removeEventListener('resize', medir); }, []);
  const mover = (d: 1 | -1) => carril.current?.scrollBy({ left: d * Math.max(200, (carril.current?.clientWidth ?? 400) * 0.7), behavior: 'smooth' });
  const boton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:text-brand-600 active:scale-95 disabled:pointer-events-none disabled:opacity-30';
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => mover(-1)} disabled={!izq} aria-label="Ver opciones anteriores" className={boton}><ChevronLeft className="h-5 w-5" /></button>
      <div ref={carril} onScroll={medir} className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth px-0.5 py-1">
        {grupos.map((g, i) => (
          <div key={i} className="flex shrink-0 gap-2">
            {i > 0 && <span className="mx-1 w-px shrink-0 bg-slate-200" />}
            {g.opciones.map(([v, l]) => (
              <button key={v} type="button" onClick={() => g.alElegir(v)} aria-pressed={g.valor === v} className={`pill shrink-0 ${g.valor === v ? 'pill-active' : ''}`}>{l}</button>
            ))}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => mover(1)} disabled={!der} aria-label="Ver más opciones" className={boton}><ChevronRight className="h-5 w-5" /></button>
    </div>
  );
}

function Tarjeta({ icon: Icon, tono, titulo, valor, detalle }: { icon: typeof Banknote; tono: string; titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="card !p-4 sm:!p-5">
      <span className={`icon-chip ${tono}`}><Icon className="h-5 w-5" /></span>
      <p className="mt-3 whitespace-nowrap text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">{valor}</p>
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      {detalle && <p className="mt-1 text-xs leading-snug text-slate-400">{detalle}</p>}
    </div>
  );
}

export default function PanelOperaciones({ operaciones }: { operaciones: OperacionItem[] }) {
  const hoy = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' }), []);
  const monedaInicial = useMemo(() => {
    const usd = operaciones.filter((o) => o.moneda === 'USD' && o.estado === 'concretada').length;
    const pyg = operaciones.filter((o) => o.moneda === 'PYG' && o.estado === 'concretada').length;
    return usd > pyg ? 'USD' : 'PYG';
  }, [operaciones]);

  const [periodo, setPeriodo] = useState('todo');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [moneda, setMoneda] = useState(monedaInicial);
  const [q, setQ] = useState('');
  const [limite, setLimite] = useState(30);
  const texto = sinTildes(q.trim());

  const datos = useMemo(() => {
    const [desde, hasta] = limites(periodo, hoy);
    const coincide = (o: OperacionItem) =>
      (!tipo || o.tipo === tipo) &&
      (!texto || sinTildes([o.propiedad, o.cliente, o.notas, o.forma_pago, o.tipo_otro].filter(Boolean).join(' ')).includes(texto));

    const enPeriodo = operaciones.filter((o) => coincide(o) && o.fecha >= desde && o.fecha <= hasta);
    const lista = enPeriodo.filter((o) => !estado || o.estado === estado);
    const concretadas = enPeriodo.filter((o) => o.estado === 'concretada');
    const enMoneda = concretadas.filter((o) => o.moneda === moneda);
    const otraMoneda = concretadas.length - enMoneda.length;
    const enCurso = enPeriodo.filter((o) => o.estado === 'en_curso').length;

    const conMonto = enMoneda.filter((o) => o.monto !== null);
    const total = suma(enMoneda.map((o) => o.monto));
    const promedio = conMonto.length ? total / conMonto.length : 0;
    const mayor = conMonto.reduce<OperacionItem | null>((a, o) => (!a || (o.monto ?? 0) > (a.monto ?? 0) ? o : a), null);
    const comisiones = suma(enMoneda.map((o) => o.comision));
    const conComision = enMoneda.filter((o) => o.comision !== null);

    // Meses considerados para el promedio mensual
    const y = Number(hoy.slice(0, 4)); const m = Number(hoy.slice(5, 7));
    let meses = 1;
    if (periodo === '3m') meses = 3;
    else if (periodo === 'anio') meses = m;
    else if (periodo === 'anio_ant') meses = 12;
    else if (periodo === 'todo' && concretadas.length) {
      const primera = concretadas.reduce((a, o) => (o.fecha < a ? o.fecha : a), concretadas[0].fecha);
      meses = Math.max(1, (y - Number(primera.slice(0, 4))) * 12 + (m - Number(primera.slice(5, 7))) + 1);
    }

    // Serie mensual (12 meses) por tipo, en la moneda elegida
    const finY = periodo === 'anio_ant' ? y - 1 : y; const finM = periodo === 'anio_ant' ? 12 : m;
    const serie = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(finY, finM - 1 - (11 - i), 1));
      const clave = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
      const del = operaciones.filter((o) => coincide(o) && o.estado === 'concretada' && o.moneda === moneda && o.fecha.startsWith(clave));
      const porTipo: Record<string, number> = {};
      del.forEach((o) => { porTipo[o.tipo] = (porTipo[o.tipo] ?? 0) + (o.monto ?? 0); });
      return { clave, etiqueta: MESES[d.getUTCMonth()], anio: d.getUTCFullYear(), total: suma(del.map((o) => o.monto)), cantidad: del.length, porTipo };
    });

    // Resumen por tipo
    const porTipo = Object.keys(TIPOS_OPERACION).map((t) => {
      const ops = enMoneda.filter((o) => o.tipo === t);
      const conM = ops.filter((o) => o.monto !== null);
      return { tipo: t, cantidad: ops.length, total: suma(ops.map((o) => o.monto)), promedio: conM.length ? suma(conM.map((o) => o.monto)) / conM.length : 0, comision: suma(ops.map((o) => o.comision)) };
    }).filter((f) => f.cantidad > 0);

    const ventas = concretadas.filter((o) => o.tipo === 'venta').length;
    const alquileres = concretadas.filter((o) => o.tipo === 'alquiler').length;
    return { lista, concretadas, otraMoneda, enCurso, total, promedio, mayor, comisiones, conComision: conComision.length, meses, serie, porTipo, ventas, alquileres, nMonto: conMonto.length };
  }, [operaciones, periodo, tipo, texto, moneda, estado, hoy]);

  const fmt = (n: number) => formatoMonto(n, moneda);
  const fmtC = (n: number) => formatoMontoCompacto(n, moneda);
  const maxSerie = Math.max(1, ...datos.serie.map((s) => s.total));
  const hayFiltros = periodo !== 'todo' || !!tipo || !!estado || !!q.trim();
  const visibles = datos.lista.slice(0, limite);

  if (operaciones.length === 0) {
    return (
      <div className="space-y-5">
        <Cabecera />
        <div className="card flex flex-col items-center py-14 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><Handshake className="h-5 w-5" /></span>
          <h2 className="mt-4">Aún no hay operaciones registradas</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Registra cada venta, alquiler o reserva con su fecha y monto para ver aquí totales, promedios y la evolución mes a mes.</p>
          <Link href="/operaciones/nueva" className="btn mt-5"><Plus className="h-4 w-4" /> Registrar la primera operación</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Cabecera />

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"><Search className="h-4 w-4" /></span>
        <input className="input !min-h-[3rem] !rounded-2xl !pl-11 !pr-11" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por propiedad, cliente o nota…" aria-label="Buscar operaciones" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute inset-y-0 right-3 my-auto flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
      </div>

      <FilaScroll grupos={[
        { valor: periodo, opciones: PERIODOS, alElegir: setPeriodo },
        { valor: tipo, opciones: Object.entries(TIPOS_OPERACION).map(([v, l]) => [v, l] as [string, string]), alElegir: (v) => setTipo(v === tipo ? '' : v) },
        { valor: estado, opciones: Object.entries(ESTADOS_OPERACION).map(([v, l]) => [v, l] as [string, string]), alElegir: (v) => setEstado(v === estado ? '' : v) },
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Los totales cuentan solo operaciones <b className="text-slate-700">concretadas</b>
          {datos.enCurso > 0 && <> · {datos.enCurso} en curso</>}
          {hayFiltros && <> · <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => { setPeriodo('todo'); setTipo(''); setEstado(''); setQ(''); }}>Quitar filtros</button></>}
        </p>
        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Moneda">
          {([['PYG', 'Guaraníes (Gs.)'], ['USD', 'Dólares (US$)']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setMoneda(v)} aria-pressed={moneda === v}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${moneda === v ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tarjeta icon={Handshake} tono="bg-brand-50 text-brand-600" titulo="Operaciones concretadas" valor={String(datos.concretadas.length)}
          detalle={`${datos.ventas} venta${datos.ventas === 1 ? '' : 's'} · ${datos.alquileres} alquiler${datos.alquileres === 1 ? '' : 'es'}`} />
        <Tarjeta icon={Banknote} tono="bg-emerald-50 text-emerald-600" titulo="Monto total" valor={fmtC(datos.total)}
          detalle={datos.nMonto ? `${fmt(datos.total)} · promedio por operación ${fmt(datos.promedio)}` : 'Sin montos cargados'} />
        <Tarjeta icon={Percent} tono="bg-amber-50 text-amber-600" titulo="Comisiones" valor={fmtC(datos.comisiones)}
          detalle={datos.conComision ? `Promedio: ${fmt(datos.comisiones / datos.conComision)}` : 'Sin comisiones cargadas'} />
        <Tarjeta icon={TrendingUp} tono="bg-sky-50 text-sky-600" titulo="Promedio mensual" valor={fmtC(datos.total / datos.meses)}
          detalle={`${(datos.concretadas.length / datos.meses).toLocaleString('es-PY', { maximumFractionDigits: 1 })} operaciones por mes`} />
      </div>

      {datos.otraMoneda > 0 && (
        <p className="rounded-xl bg-slate-100/80 px-3.5 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200/70">
          Hay {datos.otraMoneda} operación{datos.otraMoneda === 1 ? '' : 'es'} en {moneda === 'PYG' ? 'dólares' : 'guaraníes'} que no se suman aquí. Cambia la moneda arriba para verlas.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2>Evolución mensual</h2>
            <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
              {Object.entries(TIPOS_OPERACION).map(([k, l]) => (
                <span key={k} className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: OPERACION_HEX[k] }} />{l}</span>
              ))}
            </div>
          </div>
          {datos.serie.some((s) => s.total > 0) ? (
            <div className="flex h-48 items-end gap-1.5 sm:gap-2" role="img" aria-label="Montos por mes de los últimos 12 meses">
              {datos.serie.map((s) => (
                <div key={s.clave} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${s.etiqueta} ${s.anio}: ${fmt(s.total)} · ${s.cantidad} operación${s.cantidad === 1 ? '' : 'es'}`}>
                  <div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-t-md">
                    <div className="flex w-full flex-col-reverse" style={{ height: `${(s.total / maxSerie) * 100}%` }}>
                      {Object.entries(s.porTipo).map(([t, v]) => <div key={t} style={{ height: `${(v / (s.total || 1)) * 100}%`, background: OPERACION_HEX[t] }} />)}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">{s.etiqueta}</span>
                </div>
              ))}
            </div>
          ) : <p className="py-16 text-center text-sm text-slate-500">Sin montos concretados en este período.</p>}
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3">Resumen por tipo</h2>
          {datos.porTipo.length > 0 ? (
            <div className="space-y-3">
              {datos.porTipo.map((f) => (
                <div key={f.tipo} className="rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`badge ${OPERACION_COLOR[f.tipo]}`}>{TIPOS_OPERACION[f.tipo as keyof typeof TIPOS_OPERACION]}</span>
                    <span className="text-sm font-semibold text-slate-700">{f.cantidad} operación{f.cantidad === 1 ? '' : 'es'}</span>
                  </div>
                  <dl className="mt-2.5 space-y-1 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Total</dt><dd className="font-semibold text-slate-800">{fmt(f.total)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Promedio</dt><dd className="font-semibold text-slate-800">{fmt(f.promedio)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-400">Comisión</dt><dd className="font-semibold text-slate-800">{fmt(f.comision)}</dd></div>
                  </dl>
                </div>
              ))}
              {datos.mayor && (
                <p className="px-1 text-xs text-slate-500">Mayor operación: <b className="text-slate-700">{fmt(datos.mayor.monto ?? 0)}</b>{datos.mayor.propiedad ? ` · ${datos.mayor.propiedad}` : ''}</p>
              )}
            </div>
          ) : <p className="py-10 text-center text-sm text-slate-500">Sin operaciones concretadas en {moneda === 'PYG' ? 'guaraníes' : 'dólares'}.</p>}
        </section>
      </div>

      <section className="space-y-3">
        <h2>Operaciones <span className="text-base font-medium text-slate-400">({datos.lista.length})</span></h2>
        {visibles.length > 0 ? (
          <ul className="space-y-3">
            {visibles.map((o) => (
              <li key={o.id} className="card !p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`badge ${OPERACION_COLOR[o.tipo]}`}>{etiquetaOperacion(o)}</span>
                  <span className={`badge ${ESTADO_OPERACION_COLOR[o.estado]}`}>{ESTADOS_OPERACION[o.estado as keyof typeof ESTADOS_OPERACION]}</span>
                  <span className="ml-auto text-right text-lg font-bold text-slate-900">{o.monto !== null ? formatoMonto(o.monto, o.moneda) : '—'}</span>
                </div>
                <div className="mt-2.5 min-w-0">
                  {o.propiedad_id
                    ? <Link href={`/propiedades/${o.propiedad_id}?tab=operaciones`} className="block truncate font-semibold text-slate-800 hover:text-brand-700">{o.propiedad ?? 'Propiedad'}</Link>
                    : <p className="truncate font-semibold text-slate-800">{o.propiedad ?? 'Sin propiedad asignada'}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{formatoFecha(o.fecha)}</span>
                    {o.cliente && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{o.cliente}</span>}
                    {o.comision !== null && <span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" />Comisión {formatoMonto(o.comision, o.moneda)}</span>}
                    {o.tipo === 'alquiler' && o.fecha_inicio && <span>Contrato {formatoFecha(o.fecha_inicio)}{o.fecha_fin ? ` → ${formatoFecha(o.fecha_fin)}` : ''}</span>}
                    {o.forma_pago && <span>{o.forma_pago}</span>}
                  </p>
                  {o.estado !== 'cancelada' && (o.comision === null || !o.forma_pago) && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><CircleAlert className="h-3.5 w-3.5" /> Faltan datos: {[o.comision === null && 'comisión', !o.forma_pago && 'forma de pago'].filter(Boolean).join(' y ')}</p>
                  )}
                  {o.notas && <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">{o.notas}</p>}
                </div>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/operaciones/${o.id}/editar`} className="btn-secondary btn-sm"><Pencil className="h-4 w-4" /> Editar</Link>
                  <ConfirmForm accion="eliminarOperacion" args={[o.id]} mensaje="¿Eliminar esta operación? No se puede deshacer." className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /> Eliminar</ConfirmForm>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="card py-10 text-center text-sm text-slate-500">No hay operaciones con estos filtros.</p>}
        {datos.lista.length > limite && (
          <button type="button" onClick={() => setLimite(limite + 30)} className="btn-secondary mx-auto">Mostrar más ({datos.lista.length - limite} restantes)</button>
        )}
      </section>
    </div>
  );
}

function Cabecera() {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h1>Operaciones</h1>
        <p className="text-sm text-slate-500">Ventas, alquileres y reservas realizadas, con sus montos y promedios.</p>
      </div>
      <div className="flex items-center gap-2">
        <BotonesExportar recurso="operaciones" />
        <Link href="/operaciones/nueva" className="btn hidden sm:inline-flex"><Plus className="h-4 w-4" /> Registrar operación</Link>
      </div>
    </div>
  );
}
