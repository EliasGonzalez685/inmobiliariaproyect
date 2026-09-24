import Link from '@/components/LinkSeguro';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import ConfirmForm from '@/components/ConfirmForm';
import Placeholder from '@/components/Placeholder';
import { ESTADO_COLOR, etiquetaEstado } from '@/lib/constants';
import ClienteForm from '../ClienteForm';

export const dynamic = 'force-dynamic';

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const [{ data: cliente }, { data: props }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('propiedades').select('id, titulo, estado, estado_otro, codigo').eq('cliente_id', id).order('titulo'),
  ]);
  if (!cliente) notFound();

  return (
    <div className="space-y-5">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate">{cliente.nombre}</h1>
        <ConfirmForm accion="eliminarCliente" args={[id]} mensaje="¿Eliminar este cliente? Sus propiedades no se borran: quedarán sin propietario asignado." className="btn-danger btn-sm shrink-0" label="Eliminar cliente">
          <Trash2 className="h-4 w-4" /> Eliminar
        </ConfirmForm>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center gap-3"><span className="icon-chip !h-9 !w-9 bg-brand-50 text-brand-600"><Building2 className="h-[18px] w-[18px]" /></span><h2>Propiedades asociadas</h2></div>
        {props && props.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {props.map((p) => (
              <li key={p.id}>
                <Link href={`/propiedades/${p.id}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
                  <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg"><Placeholder seed={p.id} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{p.titulo}</p>{p.codigo && <p className="text-xs text-slate-500">{p.codigo}</p>}</div>
                  <span className={`badge ${ESTADO_COLOR[p.estado]}`}>{etiquetaEstado(p)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Este cliente no tiene propiedades asignadas.</p>}
      </section>

      <div className="flex items-center gap-2 pt-1"><Pencil className="h-4 w-4 text-slate-400" /><h2>Editar datos del cliente</h2></div>
      <ClienteForm cliente={cliente} />
    </div>
  );
}
