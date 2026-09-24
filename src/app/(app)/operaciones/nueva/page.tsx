import Link from '@/components/LinkSeguro';
import { ArrowLeft } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import OperacionForm from '../OperacionForm';

export const dynamic = 'force-dynamic';

export default async function NuevaOperacion({ searchParams }: { searchParams: Promise<{ propiedad?: string }> }) {
  const { propiedad } = await searchParams;
  const supabase = await createClient();
  const [, { data: propiedades }, { data: clientes }] = await Promise.all([
    requireProfile(),
    supabase.from('propiedades').select('id, titulo, codigo').order('titulo'),
    supabase.from('clientes').select('id, nombre').order('nombre'),
  ]);
  const inicial = propiedad && (propiedades ?? []).some((p) => p.id === propiedad) ? propiedad : undefined;
  return (
    <div className="space-y-5">
      <div>
        <Link href={inicial ? `/propiedades/${inicial}?tab=operaciones` : '/operaciones'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Operaciones</Link>
        <h1 className="mt-1">Registrar operación</h1>
      </div>
      <OperacionForm propiedades={propiedades ?? []} clientes={clientes ?? []} propiedadInicial={inicial} />
    </div>
  );
}
