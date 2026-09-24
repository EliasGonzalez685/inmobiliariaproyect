import { LifeBuoy, Lock } from 'lucide-react';
import { requireSoporte } from '@/lib/auth';
import UsuarioCard, { type UsuarioSoporte } from './UsuarioCard';

export default async function SoportePage() {
  const { supabase } = await requireSoporte();
  const { data, error } = await supabase.rpc('soporte_listar_usuarios');
  const usuarios = (data ?? []) as UsuarioSoporte[];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="icon-chip bg-brand-50 text-brand-600"><LifeBuoy className="h-5 w-5" /></span>
        <div>
          <h1>Soporte</h1>
          <p className="text-slate-500">Ayuda a que el personal pueda ingresar y trabajar.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-600 ring-1 ring-slate-200/70">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>Como super administrador cuidas que todo funcione, pero <b>no tienes acceso a las propiedades, clientes ni documentos</b> de la inmobiliaria: ese trabajo es solo del personal.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">No se pudo cargar la lista de usuarios.</p>}

      <div className="space-y-4">
        {usuarios.map((u) => <UsuarioCard key={u.id} u={u} />)}
        {!error && usuarios.length === 0 && <p className="card text-center text-slate-500">Todavía no hay usuarios de personal creados.</p>}
      </div>
    </div>
  );
}
