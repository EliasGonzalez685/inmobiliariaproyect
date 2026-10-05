'use client';
import { useState } from 'react';
import Link from '@/components/LinkSeguro';
import { Save } from 'lucide-react';
import Aviso from '@/components/Aviso';
import { TIPOS_CLIENTE } from '@/lib/constants';
import { useAccion } from '@/lib/llamar';

export default function ClienteForm({ cliente }: { cliente?: Record<string, any> }) {
  const c = cliente ?? {};
  const [res, enviar, pendiente] = useAccion('guardarCliente', [c.id ?? null]);
  const [tipo, setTipo] = useState<string>(c.tipo ?? 'propietario');
  return (
    <form onSubmit={enviar} className="space-y-5">
      <section className="card grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Nombre completo / razón social *</label><input className="input" name="nombre" required defaultValue={c.nombre ?? ''} /></div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>{Object.entries(TIPOS_CLIENTE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        {tipo === 'otro' && (
          <div>
            <label className="label">Escribe el tipo de cliente</label>
            <input className="input" name="tipo_otro" maxLength={60} placeholder="Ej.: Garante, Inmobiliaria asociada…" defaultValue={c.tipo_otro ?? ''} />
          </div>
        )}
        <div><label className="label">C.I. / RUC</label><input className="input" name="documento" defaultValue={c.documento ?? ''} /></div>
        <div><label className="label">Teléfono</label><input className="input" name="telefono" type="tel" inputMode="tel" defaultValue={c.telefono ?? ''} /></div>
        <div><label className="label">Correo</label><input className="input" type="email" name="email" defaultValue={c.email ?? ''} /></div>
        <div className="sm:col-span-2"><label className="label">Dirección</label><input className="input" name="direccion" defaultValue={c.direccion ?? ''} /></div>
        <div className="sm:col-span-2"><label className="label">Notas</label><textarea className="input" rows={3} name="notas" defaultValue={c.notas ?? ''} /></div>
      </section>
      <Aviso resultado={res} />
      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-lift backdrop-blur-xl lg:bottom-4">
        <button className="btn flex-1 sm:flex-none" disabled={pendiente}><Save className="h-4 w-4" /> {pendiente ? 'Guardando…' : c.id ? 'Guardar cambios' : 'Crear cliente'}</button>
        <Link href={c.id ? `/clientes/${c.id}` : '/clientes'} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
