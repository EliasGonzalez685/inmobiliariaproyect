import Link from '@/components/LinkSeguro';
import { ArrowLeft } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import PropiedadForm from '../PropiedadForm';

export default async function NuevaPropiedad() {
  const { supabase } = await requireProfile();
  const { data: clientes } = await supabase.from('clientes').select('id, nombre').order('nombre');
  return (
    <div className="space-y-5">
      <div>
        <Link href="/propiedades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Propiedades</Link>
        <h1 className="mt-1">Nueva propiedad</h1>
        <p className="text-sm text-slate-500">Todos los datos son opcionales: completa solo lo que tengas ahora. Después podrás editar la propiedad, agregar lo que falte y subir más fotos, videos y documentos.</p>
      </div>
      <PropiedadForm clientes={clientes ?? []} />
    </div>
  );
}
