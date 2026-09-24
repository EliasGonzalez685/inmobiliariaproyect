import Link from '@/components/LinkSeguro';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import OperacionForm from '../../OperacionForm';

export const dynamic = 'force-dynamic';

export default async function EditarOperacion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string }> }) {
  const { id } = await params;
  const { volver } = await searchParams;
  const supabase = await createClient();
  const [, { data: operacion }, { data: propiedades }, { data: clientes }] = await Promise.all([
    requireProfile(),
    supabase.from('operaciones').select('*').eq('id', id).single(),
    supabase.from('propiedades').select('id, titulo, codigo').order('titulo'),
    supabase.from('clientes').select('id, nombre').order('nombre'),
  ]);
  if (!operacion) notFound();
  const volverA = volver && volver === operacion.propiedad_id ? volver : undefined;
  return (
    <div className="space-y-5">
      <div>
        <Link href={volverA ? `/propiedades/${volverA}?tab=operaciones` : '/operaciones'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> {volverA ? 'Propiedad' : 'Operaciones'}</Link>
        <h1 className="mt-1">Editar operación</h1>
      </div>
      <OperacionForm operacion={operacion} propiedades={propiedades ?? []} clientes={clientes ?? []} volverA={volverA} />
    </div>
  );
}
