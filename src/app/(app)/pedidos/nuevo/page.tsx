import Link from '@/components/LinkSeguro';
import { ArrowLeft } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import PedidoForm from '../PedidoForm';

export const dynamic = 'force-dynamic';

export default async function NuevoPedido() {
  const supabase = await createClient();
  const [, { data: clientes }] = await Promise.all([requireProfile(), supabase.from('clientes').select('id, nombre').order('nombre')]);
  return (
    <div className="space-y-5">
      <div>
        <Link href="/pedidos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Pedidos</Link>
        <h1 className="mt-1">Nuevo pedido</h1>
      </div>
      <PedidoForm clientes={clientes ?? []} />
    </div>
  );
}
