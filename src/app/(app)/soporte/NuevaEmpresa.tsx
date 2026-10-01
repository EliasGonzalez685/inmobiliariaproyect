'use client';
import { useActionState } from 'react';
import { Building2 } from 'lucide-react';
import Aviso from '@/components/Aviso';
import { crearEmpresa } from './actions';

export default function NuevaEmpresa() {
  const [res, accion, pendiente] = useActionState(crearEmpresa, null);
  return (
    <form action={accion} className="card flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <label className="label" htmlFor="nueva-empresa-nombre">Nueva empresa</label>
        <input id="nueva-empresa-nombre" name="nombre" className="input" required placeholder="Nombre de la inmobiliaria" />
      </div>
      <button className="btn btn-sm" disabled={pendiente}><Building2 className="h-4 w-4" /> {pendiente ? 'Creando…' : 'Crear empresa'}</button>
      <div className="w-full"><Aviso resultado={res} /></div>
    </form>
  );
}
