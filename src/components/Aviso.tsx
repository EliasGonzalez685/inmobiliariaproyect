import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Mensaje de resultado de un formulario (éxito o error).
export default function Aviso({ resultado }: { resultado: { ok?: string; error?: string } | null }) {
  if (!resultado) return null;
  if (resultado.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {resultado.error}
      </p>
    );
  }
  if (resultado.ok) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {resultado.ok}
      </p>
    );
  }
  return null;
}
