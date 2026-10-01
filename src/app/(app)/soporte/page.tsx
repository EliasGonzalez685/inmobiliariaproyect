import { LifeBuoy, Lock } from 'lucide-react';
import { requireSoporte } from '@/lib/auth';
import EmpresaCard, { type EmpresaSoporte } from './EmpresaCard';
import NuevaEmpresa from './NuevaEmpresa';
import type { UsuarioSoporte } from './UsuarioCard';

export default async function SoportePage() {
  const { supabase } = await requireSoporte();
  const [{ data: dataEmpresas, error: errorEmpresas }, { data: dataUsuarios, error: errorUsuarios }] = await Promise.all([
    supabase.rpc('soporte_listar_empresas'),
    supabase.rpc('soporte_listar_personal'),
  ]);
  const empresas = (dataEmpresas ?? []) as EmpresaSoporte[];
  const usuarios = (dataUsuarios ?? []) as UsuarioSoporte[];
  const error = errorEmpresas || errorUsuarios;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="icon-chip bg-brand-50 text-brand-600"><LifeBuoy className="h-5 w-5" /></span>
        <div>
          <h1>Soporte</h1>
          <p className="text-slate-500">Administra las empresas y el personal que usa el sistema.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-600 ring-1 ring-slate-200/70">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>Como super administrador cuidas que todo funcione, pero <b>no tienes acceso a las propiedades, clientes ni documentos</b> de ninguna empresa: ese trabajo es solo del personal de cada una, y los datos de una empresa nunca se mezclan con los de otra.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">No se pudo cargar la información.</p>}

      <NuevaEmpresa />

      <div className="space-y-4">
        {empresas.map((e) => (
          <EmpresaCard key={e.id} empresa={e} usuarios={usuarios.filter((u) => u.empresa_id === e.id)} />
        ))}
        {!error && empresas.length === 0 && <p className="card text-center text-slate-500">Todavía no hay empresas creadas.</p>}
      </div>
    </div>
  );
}
