'use client';
import { useState } from 'react';
import { llamar } from '@/lib/llamar';

// Formulario con confirmación antes de una acción destructiva.
// · `accion` + `args`: se ejecuta con una petición normal (fetch, con tiempo máximo) y luego la página va a la
//   dirección indicada o se recarga, para que nunca quede esperando ni con datos viejos.
// · `action`: forma anterior (acción del servidor directa), solo para las pantallas de soporte.
export default function ConfirmForm({ accion, args, action, mensaje, children, className, label }: {
  accion?: string;
  args?: unknown[];
  action?: () => unknown | Promise<unknown>;
  mensaje?: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!accion && action) {
    return (
      <form
        action={async () => {
          const res = (await action()) as { ir?: string } | undefined | void;
          if (res && typeof res === 'object' && res.ir) window.location.assign(res.ir);
          else window.location.reload();
        }}
        onSubmit={(e) => { if (mensaje && !confirm(mensaje)) e.preventDefault(); }}
      >
        <button className={className ?? 'btn-danger btn-sm'} aria-label={label}>{children}</button>
      </form>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (pendiente || !accion) return;
    if (mensaje && !confirm(mensaje)) return;
    setPendiente(true);
    setError(null);
    const res = await llamar(accion, args ?? []);
    if (res.error) { setError(res.error); setPendiente(false); return; }
    if (res.ir) window.location.assign(res.ir);
    else window.location.reload();
  }

  return (
    <form onSubmit={enviar}>
      <button className={className ?? 'btn-danger btn-sm'} aria-label={label} disabled={pendiente}>{children}</button>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </form>
  );
}
