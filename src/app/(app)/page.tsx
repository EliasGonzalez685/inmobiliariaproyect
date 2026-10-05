import Link from '@/components/LinkSeguro';
import { Building2, CircleAlert, CircleCheck, ClipboardList, Handshake, KeyRound, Plus, Wrench } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import Donut from '@/components/Donut';
import { ESTADOS_PEDIDO, ESTADOS_PROPIEDAD, ESTADO_HEX, ESTADO_PEDIDO_COLOR, OPERACION_COLOR, etiquetaOperacion, etiquetaTipo } from '@/lib/constants';
import { formatoFecha, formatoMonto, saludoFecha } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Panel() {
  const { supabase, profile } = await requireProfile();

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  const [{ data: resumen }, { data: props }, { data: recientes }, { data: delMes }, { data: pedidosPendientes }, { data: conFotos }] = await Promise.all([
    supabase.from('resumen_patrimonio').select('*').single(),
    supabase.from('propiedades').select('id, estado, cliente_id, precio'),
    supabase.from('operaciones').select('id, tipo, tipo_otro, estado, fecha, monto, moneda, propiedad_id, propiedad_titulo, propiedades(titulo)')
      .order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(5),
    supabase.from('operaciones').select('tipo, monto, moneda').eq('estado', 'concretada').gte('fecha', inicioMes),
    supabase.from('pedidos').select('id, cliente_nombre, tipo, tipo_otro, ubicacion, presupuesto, moneda, estado, created_at')
      .in('estado', ['pendiente', 'en_proceso']).order('created_at', { ascending: false }).limit(6),
    supabase.from('propiedad_fotos').select('propiedad_id'),
  ]);

  const total = resumen?.total ?? 0;
  const conteo = (props ?? []).reduce<Record<string, number>>((a, p) => ({ ...a, [p.estado]: (a[p.estado] ?? 0) + 1 }), {});
  const donut = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({
    nombre: ESTADOS_PROPIEDAD[k as keyof typeof ESTADOS_PROPIEDAD] ?? k, valor: v, color: ESTADO_HEX[k] ?? '#94a3b8',
  }));

  // Aviso corto de datos que faltan (sin fotos, sin propietario o sin precio)
  const idsConFotos = new Set((conFotos ?? []).map((f) => f.propiedad_id));
  const pendientes = [
    [(props ?? []).filter((x) => !idsConFotos.has(x.id)).length, 'sin fotos'],
    [(props ?? []).filter((x) => !x.cliente_id).length, 'sin propietario'],
    [(props ?? []).filter((x) => x.precio === null).length, 'sin precio'],
  ].filter(([n]) => (n as number) > 0) as [number, string][];

  const mesVentas = (delMes ?? []).filter((o) => o.tipo === 'venta').length;
  const mesAlquileres = (delMes ?? []).filter((o) => o.tipo === 'alquiler').length;
  const mesTotal = (moneda: string) => (delMes ?? []).filter((o) => o.moneda === moneda).reduce((a, o) => a + Number(o.monto ?? 0), 0);
  const totalesMes = (['PYG', 'USD'] as const).map((m) => [m, mesTotal(m)] as const).filter(([, t]) => t > 0);
  const nombre = (profile.nombre || profile.usuario || '').split(' ')[0];

  const tarjetas = [
    { icon: Building2, tono: 'bg-brand-50 text-brand-600', label: 'Propiedades', valor: total, hint: 'Total' },
    { icon: CircleCheck, tono: 'bg-emerald-50 text-emerald-600', label: 'Disponibles', valor: resumen?.disponibles ?? 0, hint: 'Para ofrecer' },
    { icon: KeyRound, tono: 'bg-sky-50 text-sky-600', label: 'Ocupadas / alquiladas', valor: resumen?.ocupadas ?? 0, hint: 'En uso' },
    { icon: Wrench, tono: 'bg-orange-50 text-orange-600', label: 'En mantenimiento', valor: resumen?.en_mantenimiento ?? 0, hint: 'Atención' },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium capitalize text-brand-200">{saludoFecha()}</p>
            <h1 className="!text-2xl !text-white sm:!text-3xl">Bienvenido/a{nombre ? ` ${nombre}` : ''}</h1>
            <p className="mt-2 max-w-md text-brand-100">
              {(delMes ?? []).length === 0
                ? 'Todavía no hay operaciones concretadas este mes.'
                : <>Este mes: <b className="text-white">{mesVentas} venta{mesVentas === 1 ? '' : 's'}</b> y <b className="text-white">{mesAlquileres} alquiler{mesAlquileres === 1 ? '' : 'es'}</b> concretados{totalesMes.length > 0 && <> · {totalesMes.map(([m, t]) => formatoMonto(t, m)).join(' + ')}</>}.</>}
            </p>
          </div>
          <Link href="/propiedades/nueva" className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-sm font-semibold text-brand-700 shadow-lift transition hover:bg-brand-50 active:scale-[.98] sm:self-auto">
            <Plus className="h-4 w-4" /> Nueva propiedad
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tarjetas.map(({ icon: Icon, tono, label, valor, hint }) => (
          <div key={label} className="card card-hover !p-4 sm:!p-5">
            <div className="flex items-center justify-between">
              <span className={`icon-chip ${tono}`}><Icon className="h-5 w-5" /></span>
              <span className="text-xs font-medium text-slate-400">{hint}</span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{valor}</p>
            <p className="text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card lg:col-span-3 lg:self-start">
          <h2 className="mb-5">Estado del patrimonio</h2>
          <Donut datos={donut} total={total} etiqueta="propiedades" />
          <div className="mt-6 border-t border-slate-100 pt-4">
            {pendientes.length > 0 ? (
              <Link href="/propiedades" className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-100 hover:bg-amber-100/70">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Faltan datos: {pendientes.map(([n, t]) => `${n} ${t}`).join(' · ')}</span>
              </Link>
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100"><CircleCheck className="h-4 w-4 shrink-0" /> Todas tus propiedades tienen fotos, propietario y precio.</p>
            )}
          </div>
        </section>

        <section className="card lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2>Operaciones recientes</h2>
            <Link href="/operaciones" className="text-sm font-semibold text-brand-600 hover:underline">Ver todas</Link>
          </div>
          {recientes && recientes.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recientes.map((o) => {
                const prop = (o.propiedades as unknown as { titulo: string } | null)?.titulo ?? o.propiedad_titulo;
                return (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <span className={`icon-chip !h-9 !w-9 ${OPERACION_COLOR[o.tipo]}`}><Handshake className="h-[18px] w-[18px]" /></span>
                    <div className="min-w-0 flex-1">
                      <Link href="/operaciones" className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700">{etiquetaOperacion(o)} · {prop ?? 'Sin propiedad'}</Link>
                      <p className="truncate text-xs text-slate-500">{formatoFecha(o.fecha)}{o.estado !== 'concretada' ? ` · ${o.estado === 'en_curso' ? 'En curso' : 'Cancelada'}` : ''}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-800">{o.monto !== null ? formatoMonto(o.monto, o.moneda) : '—'}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">Aún no registraste operaciones.</p>
              <Link href="/operaciones/nueva" className="btn btn-sm mt-3"><Plus className="h-4 w-4" /> Registrar operación</Link>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2>Pedidos pendientes</h2>
          <Link href="/pedidos" className="text-sm font-semibold text-brand-600 hover:underline">Ver todos</Link>
        </div>
        {pedidosPendientes && pedidosPendientes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {pedidosPendientes.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="icon-chip bg-violet-50 text-violet-600"><ClipboardList className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <Link href={`/pedidos/${p.id}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700">{p.cliente_nombre} · {etiquetaTipo(p)}</Link>
                  <p className="truncate text-xs text-slate-500">{p.ubicacion ?? 'Sin zona'}{p.presupuesto !== null ? ` · ${formatoMonto(p.presupuesto, p.moneda)}` : ''}</p>
                </div>
                <span className={`badge shrink-0 ${ESTADO_PEDIDO_COLOR[p.estado]}`}>{ESTADOS_PEDIDO[p.estado as keyof typeof ESTADOS_PEDIDO]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500">No hay pedidos pendientes.</p>
            <Link href="/pedidos/nuevo" className="btn btn-sm mt-3"><Plus className="h-4 w-4" /> Registrar pedido</Link>
          </div>
        )}
      </section>
    </div>
  );
}
