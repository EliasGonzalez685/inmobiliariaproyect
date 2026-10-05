'use client';
import { useState } from 'react';
import Link from '@/components/LinkSeguro';
import { Save } from 'lucide-react';
import Aviso from '@/components/Aviso';
import CampoMonto from '@/components/CampoMonto';
import { ESTADOS_PEDIDO, MONEDAS, TIPOS_PROPIEDAD } from '@/lib/constants';
import { useAccion } from '@/lib/llamar';

type P = Record<string, any>;

export default function PedidoForm({ pedido, clientes }: { pedido?: P; clientes: { id: string; nombre: string }[] }) {
  const p: P = pedido ?? {};
  const [res, enviar, pendiente] = useAccion('guardarPedido', [p.id ?? null]);
  const [clienteId, setClienteId] = useState<string>(p.cliente_id ?? '');
  const [tipo, setTipo] = useState<string>(p.tipo ?? 'casa');

  return (
    <form onSubmit={enviar} className="space-y-5">
      <section className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Cliente registrado (opcional)</label>
            <select className="input" name="cliente_id" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Cliente no registrado (escribe sus datos)</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="hidden sm:block" />
          {!clienteId && (
            <>
              <div>
                <label className="label">Nombre de quien pide *</label>
                <input className="input" name="cliente_nombre" required defaultValue={p.cliente_nombre ?? ''} placeholder="Nombre y apellido" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" name="cliente_telefono" type="tel" inputMode="tel" defaultValue={p.cliente_telefono ?? ''} />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Propiedad que busca</label>
          <select className="input" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_PROPIEDAD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {tipo === 'otro' && (
          <div>
            <label className="label">Escribe qué tipo de propiedad busca</label>
            <input className="input" name="tipo_otro" maxLength={60} placeholder="Ej.: Chacra, galpón…" defaultValue={p.tipo_otro ?? ''} />
          </div>
        )}
        <div className={tipo === 'otro' ? '' : 'sm:col-span-2'}>
          <label className="label">Ubicación / zona que busca</label>
          <input className="input" name="ubicacion" placeholder="Ej.: Barrio Jara, Asunción" defaultValue={p.ubicacion ?? ''} />
        </div>
        <div>
          <label className="label">Medidas que busca</label>
          <input className="input" name="medidas" placeholder="Ej.: 300 m² o más" defaultValue={p.medidas ?? ''} />
        </div>
        <div>
          <label className="label">Moneda</label>
          <select className="input" name="moneda" defaultValue={p.moneda ?? 'PYG'}>
            {Object.entries(MONEDAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <CampoMonto name="presupuesto" label="Presupuesto" defaultValue={p.presupuesto} placeholder="0" />
        <div>
          <label className="label">Estado del pedido</label>
          <select className="input" name="estado" defaultValue={p.estado ?? 'pendiente'}>
            {Object.entries(ESTADOS_PEDIDO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descripción</label>
          <textarea className="input" rows={3} name="descripcion" placeholder="Cualquier otro detalle del pedido" defaultValue={p.descripcion ?? ''} />
        </div>
      </section>

      <Aviso resultado={res} />
      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-lift backdrop-blur-xl lg:bottom-4">
        <button className="btn flex-1 sm:flex-none" disabled={pendiente}><Save className="h-4 w-4" /> {pendiente ? 'Guardando…' : p.id ? 'Guardar cambios' : 'Guardar pedido'}</button>
        <Link href={p.id ? `/pedidos/${p.id}` : '/pedidos'} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
