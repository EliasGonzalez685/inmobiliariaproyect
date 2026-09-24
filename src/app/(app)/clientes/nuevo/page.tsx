import Link from '@/components/LinkSeguro';
import { ArrowLeft } from 'lucide-react';
import ClienteForm from '../ClienteForm';

export default function NuevoCliente() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Clientes</Link>
        <h1 className="mt-1">Nuevo cliente</h1>
      </div>
      <ClienteForm />
    </div>
  );
}
