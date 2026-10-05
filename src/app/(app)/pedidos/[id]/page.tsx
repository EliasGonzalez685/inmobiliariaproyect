import Link from '@/components/LinkSeguro';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight, Sparkles, Trash2 } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ConfirmForm from '@/components/ConfirmForm';
import Placeholder from '@/components/Placeholder';
import { etiquetaTipo } from '@/lib/constants';
import { formatoMonto } from '@/lib/format';
import { coincidencias } from '@/lib/pedidos';
import PedidoForm from '../PedidoForm';

export const dynamic = 'force-dynamic';

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const [{ data: pedido }, { data: clientes }, { data: propiedades }] = await Promise.all([
    supabase.from('pedidos').select('*').eq('id', id).single(),
    supabase.from('clientes').select('id, nombre').order('nombre'),
    supabase.from('propiedades').select('id, titulo, codigo, tipo, barrio, ciudad, direccion, precio, moneda, estado').eq('estado', 'disponible'),
  ]);
  if (!pedido) notFound();

  const disponibles = (propiedades ?? []).map((p) => ({ ...p, precio: p.precio === null ? null : Number(p.precio) }));
  const match = coincidencias({ ...pedido, presupuesto: pedido.presupuesto === null ? null : Number(pedido.presupuesto) }, disponibles);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/pedidos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Pedidos</Link>
        <ConfirmForm accion="eliminarPedido" args={[id]} mensaje="¿Eliminar este pedido? No se puede deshacer." className="btn-danger btn-sm" label="Eliminar pedido">
          <Trash2 className="h-4 w-4" /> Eliminar
        </ConfirmForm>
      </div>
      <h1>{pedido.cliente_nombre} <span className="text-base font-medium text-slate-400">· {etiquetaTipo(pedido)}</span></h1>

      {match.length > 0 && (
        <section className="card border-2 border-emerald-200/70 bg-emerald-50/40">
          <div className="mb-3 flex items-center gap-2 text-emerald-800"><Sparkles className="h-4 w-4" /><h2 className="text-emerald-800">Propiedades disponibles que podrían servirle</h2></div>
          <ul className="divide-y divide-emerald-100">
            {match.map((p) => (
              <li key={p.id}>
                <Link href={`/propiedades/${p.id}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
                  <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg"><Placeholder seed={p.id} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.titulo}</p>
                    <p className="truncate text-xs text-slate-500">{[p.barrio, p.ciudad].filter(Boolean).join(', ') || p.direccion}{p.precio && ` · ${formatoMonto(p.precio, p.moneda)}`}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PedidoForm pedido={pedido} clientes={clientes ?? []} />
    </div>
  );
}
