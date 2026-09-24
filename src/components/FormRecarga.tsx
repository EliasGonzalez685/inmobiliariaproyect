'use client';
import { useState } from 'react';
import { llamar } from '@/lib/llamar';

// Formulario que ejecuta una acción con una petición normal (fetch) y luego recarga la página con el método directo del navegador.
export default function FormRecarga({ accion, args, children, className }: {
  accion: string;
  args?: unknown[];
  children: React.ReactNode;
  className?: string;
}) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendiente) return;
    setPendiente(true);
    setError(null);
    const res = await llamar(accion, args ?? [], new FormData(e.currentTarget));
    if (res.error) { setError(res.error); setPendiente(false); return; }
    if (res.ir) window.location.assign(res.ir);
    else window.location.reload();
  }

  return (
    <form className={className} onSubmit={enviar} aria-busy={pendiente}>
      {children}
      {error && <p role="alert" className="text-xs font-medium text-red-600 sm:col-span-2 lg:col-span-4">{error}</p>}
    </form>
  );
}
