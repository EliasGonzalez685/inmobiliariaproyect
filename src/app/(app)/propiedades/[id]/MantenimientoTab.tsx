import { Banknote, Play, Plus, CircleCheck } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import ConfirmForm from '@/components/ConfirmForm';
import FormRecarga from '@/components/FormRecarga';
import { ESTADOS_MANTENIMIENTO, MONEDAS, TIPOS_MANTENIMIENTO } from '@/lib/constants';
import { formatoFecha, formatoMonto } from '@/lib/format';

const COLOR: Record<string, { badge: string; hex: string }> = {
  pendiente: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', hex: '#f59e0b' },
  en_proceso: { badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', hex: '#0ea5e9' },
  completado: { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', hex: '#10b981' },
};

export default async function MantenimientoTab({ propiedadId }: { propiedadId: string }) {
  const { supabase } = await requireProfile();
  const { data: items } = await supabase.from('mantenimientos').select('*').eq('propiedad_id', propiedadId).order('fecha', { ascending: false });

  const totales = (items ?? []).reduce<Record<string, number>>((a, m) => (m.costo ? { ...a, [m.moneda]: (a[m.moneda] ?? 0) + Number(m.costo) } : a), {});

  return (
    <div className="space-y-4">
      <details className="card group !p-0" open={(items ?? []).length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3"><span className="icon-chip !h-9 !w-9 bg-brand-50 text-brand-600"><Plus className="h-[18px] w-[18px]" /></span>Registrar intervención</span>
          <span className="text-xs font-medium text-slate-400 group-open:hidden">Tocar para abrir</span>
        </summary>
        <FormRecarga accion="agregarMantenimiento" args={[propiedadId]} className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2"><label className="label">Intervención *</label><input className="input" name="titulo" required placeholder="Ej.: Reparación de techo" /></div>
          <div><label className="label">Tipo</label><select className="input" name="tipo">{Object.entries(TIPOS_MANTENIMIENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label">Estado</label><select className="input" name="estado">{Object.entries(ESTADOS_MANTENIMIENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label">Fecha</label><input className="input" type="date" name="fecha" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div><label className="label">Costo</label><input className="input" type="number" step="0.01" name="costo" inputMode="decimal" /></div>
          <div><label className="label">Moneda</label><select className="input" name="moneda">{Object.entries(MONEDAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label">Realizado por</label><input className="input" name="responsable" placeholder="Persona o empresa" /></div>
          <div className="sm:col-span-2"><label className="label">Descripción</label><input className="input" name="descripcion" /></div>
          <div className="sm:col-span-2"><label className="label">Resultado</label><input className="input" name="resultado" /></div>
          <div className="lg:col-span-4"><button className="btn w-full sm:w-auto">Guardar intervención</button></div>
        </FormRecarga>
      </details>

      {Object.keys(totales).length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-50 to-violet-50 p-4 ring-1 ring-brand-100">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-600"><Banknote className="h-5 w-5 text-brand-600" /> Costo total registrado</span>
          <span className="text-right text-lg font-bold text-slate-900">{Object.entries(totales).map(([m, t]) => formatoMonto(t, m)).join(' + ')}</span>
        </div>
      )}

      {(items ?? []).length === 0 ? (
        <div className="card py-10 text-center text-sm text-slate-500">Todavía no hay intervenciones registradas para esta propiedad.</div>
      ) : (
        <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
          {items!.map((m) => (
            <li key={m.id} className="relative">
              <span className="absolute -left-[33px] top-5 h-4 w-4 rounded-full border-4 border-slate-50" style={{ background: COLOR[m.estado].hex }} />
              <div className="card !p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{m.titulo}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatoFecha(m.fecha)} · {TIPOS_MANTENIMIENTO[m.tipo as keyof typeof TIPOS_MANTENIMIENTO]}
                      {m.responsable && ` · ${m.responsable}`}{m.costo && ` · ${formatoMonto(m.costo, m.moneda)}`}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ${COLOR[m.estado].badge}`}>{ESTADOS_MANTENIMIENTO[m.estado as keyof typeof ESTADOS_MANTENIMIENTO]}</span>
                </div>
                {m.descripcion && <p className="mt-2 text-sm text-slate-600">{m.descripcion}</p>}
                {m.resultado && <p className="mt-1 text-sm text-slate-600"><span className="text-slate-400">Resultado:</span> {m.resultado}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.estado === 'pendiente' && (
                    <FormRecarga accion="cambiarEstadoMantenimiento" args={[m.id, propiedadId, 'en_proceso']}><button className="btn-secondary btn-sm"><Play className="h-3.5 w-3.5" /> Iniciar</button></FormRecarga>
                  )}
                  {m.estado !== 'completado' && (
                    <FormRecarga accion="cambiarEstadoMantenimiento" args={[m.id, propiedadId, 'completado']}><button className="btn btn-sm"><CircleCheck className="h-3.5 w-3.5" /> Marcar completado</button></FormRecarga>
                  )}
                  <ConfirmForm accion="eliminarMantenimiento" args={[m.id, propiedadId]} mensaje="¿Eliminar este registro?">Eliminar</ConfirmForm>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
