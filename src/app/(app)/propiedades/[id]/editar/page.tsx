import Link from '@/components/LinkSeguro';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import PropiedadForm from '../../PropiedadForm';

export default async function EditarPropiedad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireProfile();
  const [{ data: propiedad }, { data: clientes }] = await Promise.all([
    supabase.from('propiedades').select('*').eq('id', id).single(),
    supabase.from('clientes').select('id, nombre').order('nombre'),
  ]);
  if (!propiedad) notFound();
  return (
    <div className="space-y-5">
      <div>
        <Link href={`/propiedades/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> {propiedad.titulo}</Link>
        <h1 className="mt-1">Editar propiedad</h1>
      </div>
      <PropiedadForm propiedad={propiedad} clientes={clientes ?? []} />
    </div>
  );
}
