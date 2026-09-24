import Link from '@/components/LinkSeguro';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <span className="icon-chip mx-auto bg-brand-50 text-brand-600"><SearchX className="h-5 w-5" /></span>
      <h2 className="mt-4">No encontramos lo que buscas</h2>
      <p className="mt-1 text-sm text-slate-500">Puede que haya sido eliminado o que el enlace sea incorrecto.</p>
      <Link href="/" className="btn mt-5">Volver al panel</Link>
    </div>
  );
}
