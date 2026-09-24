'use client';
import { useState } from 'react';
import Link from '@/components/LinkSeguro';
import { Banknote, CalendarRange, FileText, Save } from 'lucide-react';
import Aviso from '@/components/Aviso';
import { ESTADOS_OPERACION, ESTADOS_PROPIEDAD, ESTADO_POR_OPERACION, MONEDAS, TIPOS_OPERACION } from '@/lib/constants';
import { useAccion } from '@/lib/llamar';

type Op = Record<string, any>;

function Seccion({ icon: Icon, titulo, tono, children }: { icon: typeof FileText; titulo: string; tono: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="mb-5 flex items-center gap-3"><span className={`icon-chip !h-9 !w-9 ${tono}`}><Icon className="h-[18px] w-[18px]" /></span><h2>{titulo}</h2></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function OperacionForm({ operacion, propiedades, clientes, propiedadInicial, volverA }: {
  operacion?: Op;
  propiedades: { id: string; titulo: string; codigo: string | null }[];
  clientes: { id: string; nombre: string }[];
  propiedadInicial?: string;
  volverA?: string;
}) {
  const o: Op = operacion ?? {};
  const [res, enviar, pendiente] = useAccion('guardarOperacion', [o.id ?? null]);
  const [tipo, setTipo] = useState<string>(o.tipo ?? 'venta');
  const [propiedad, setPropiedad] = useState<string>(o.propiedad_id ?? propiedadInicial ?? '');
  const [monto, setMonto] = useState<string>(o.monto != null ? String(Number(o.monto)) : '');
  const [comision, setComision] = useState<string>(o.comision != null ? String(Number(o.comision)) : '');
  const [porcentaje, setPorcentaje] = useState('');

  const calcularComision = (pct: string, base: string) => {
    const p = Number(pct.replace(',', '.'));
    const m = Number(base.replace(',', '.'));
    if (pct.trim() !== '' && Number.isFinite(p) && Number.isFinite(m) && base.trim() !== '') setComision(String(Number(((m * p) / 100).toFixed(2))));
  };

  const nuevoEstado = ESTADO_POR_OPERACION[tipo];
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });

  return (
    <form onSubmit={enviar} className="space-y-5">
      {(volverA ?? (!o.id ? propiedadInicial : undefined)) && <input type="hidden" name="volver" value={volverA ?? propiedadInicial} />}

      <Seccion icon={FileText} titulo="Operación" tono="bg-brand-50 text-brand-600">
        <div>
          <label className="label">Tipo de operación</label>
          <select className="input" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_OPERACION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {tipo === 'otro' && (
          <div>
            <label className="label">¿Cuál?</label>
            <input className="input" name="tipo_otro" maxLength={60} placeholder="Ej.: Permuta, Cesión…" defaultValue={o.tipo_otro ?? ''} />
          </div>
        )}
        <div>
          <label className="label">Estado</label>
          <select className="input" name="estado" defaultValue={o.estado ?? 'concretada'}>
            {Object.entries(ESTADOS_OPERACION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fecha *</label>
          <input className="input" type="date" name="fecha" required defaultValue={o.fecha ?? hoy} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Propiedad</label>
          <select className="input" name="propiedad_id" value={propiedad} onChange={(e) => setPropiedad(e.target.value)}>
            <option value="">— Sin propiedad —</option>
            {propiedades.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ''}{p.titulo}</option>)}
          </select>
          {!propiedad && o.propiedad_titulo && <p className="mt-1.5 text-xs text-slate-400">Propiedad original (ya eliminada): {o.propiedad_titulo}</p>}
        </div>
        <div>
          <label className="label">{tipo === 'alquiler' ? 'Inquilino' : tipo === 'venta' ? 'Comprador' : 'Cliente'}</label>
          <select className="input" name="cliente_id" defaultValue={o.cliente_id ?? ''}>
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {!o.cliente_id && o.cliente_nombre && <p className="mt-1.5 text-xs text-slate-400">Cliente original (ya eliminado): {o.cliente_nombre}</p>}
        </div>
        {nuevoEstado && propiedad && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-brand-50/60 px-3.5 py-3 text-sm font-medium text-slate-700 ring-1 ring-brand-100 sm:col-span-2 lg:col-span-3">
            <input type="checkbox" name="actualizar_estado" value="1" defaultChecked={!o.id} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Marcar la propiedad como <b className="text-brand-700">{ESTADOS_PROPIEDAD[nuevoEstado]}</b>
          </label>
        )}
      </Seccion>

      <Seccion icon={Banknote} titulo="Montos" tono="bg-emerald-50 text-emerald-600">
        <div>
          <label className="label">Moneda</label>
          <select className="input" name="moneda" defaultValue={o.moneda ?? 'PYG'}>{Object.entries(MONEDAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div>
          <label className="label">{tipo === 'alquiler' ? 'Monto (alquiler mensual)' : 'Monto de la operación'}</label>
          <input className="input" name="monto" type="number" step="any" min="0" inputMode="decimal" value={monto}
            onChange={(e) => { setMonto(e.target.value); calcularComision(porcentaje, e.target.value); }} />
        </div>
        <div className="hidden lg:block" />
        <div>
          <label className="label">Comisión % (opcional)</label>
          <input className="input" type="number" step="any" min="0" inputMode="decimal" placeholder="Ej.: 3" value={porcentaje}
            onChange={(e) => { setPorcentaje(e.target.value); calcularComision(e.target.value, monto); }} />
        </div>
        <div>
          <label className="label">Comisión (monto)</label>
          <input className="input" name="comision" type="number" step="any" min="0" inputMode="decimal" value={comision} onChange={(e) => setComision(e.target.value)} />
        </div>
        <div>
          <label className="label">Forma de pago</label>
          <input className="input" name="forma_pago" placeholder="Ej.: Contado, transferencia, cuotas…" defaultValue={o.forma_pago ?? ''} />
        </div>
      </Seccion>

      {tipo === 'alquiler' && (
        <Seccion icon={CalendarRange} titulo="Contrato de alquiler" tono="bg-sky-50 text-sky-600">
          <div><label className="label">Inicio del contrato</label><input className="input" type="date" name="fecha_inicio" defaultValue={o.fecha_inicio ?? ''} /></div>
          <div><label className="label">Fin del contrato</label><input className="input" type="date" name="fecha_fin" defaultValue={o.fecha_fin ?? ''} /></div>
        </Seccion>
      )}

      <section className="card">
        <label className="label">Notas</label>
        <textarea className="input" rows={3} name="notas" defaultValue={o.notas ?? ''} />
      </section>

      <Aviso resultado={res} />
      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-lift backdrop-blur-xl lg:bottom-4">
        <button className="btn flex-1 sm:flex-none" disabled={pendiente}><Save className="h-4 w-4" /> {pendiente ? 'Guardando…' : o.id ? 'Guardar cambios' : 'Registrar operación'}</button>
        <Link href={(volverA ?? propiedadInicial) ? `/propiedades/${volverA ?? propiedadInicial}?tab=operaciones` : '/operaciones'} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
