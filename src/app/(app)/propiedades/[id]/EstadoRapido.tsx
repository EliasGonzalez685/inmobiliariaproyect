'use client';
import { useState } from 'react';
import Link from '@/components/LinkSeguro';
import { Handshake, RefreshCw } from 'lucide-react';
import { ESTADOS_PROPIEDAD } from '@/lib/constants';
import { llamar } from '@/lib/llamar';

/** Permite cambiar el estado de la propiedad en cualquier momento (se alquiló, se vendió, entra en obra…). */
export default function EstadoRapido({ id, estado, estadoOtro, nuevaOperacion }: { id: string; estado: string; estadoOtro: string | null; nuevaOperacion?: string }) {
  const guardado = { estado, otro: estadoOtro ?? '' };
  const [valor, setValor] = useState(estado);
  const [otro, setOtro] = useState(estadoOtro ?? '');
  const [error, setError] = useState<string | null>(null);
  const [operacion, setOperacion] = useState<{ id: string; creada: boolean } | null>(nuevaOperacion ? { id: nuevaOperacion, creada: true } : null);
  const [pendiente, setPendiente] = useState(false);

  const cambio = valor !== guardado.estado || (valor === 'otro' && otro.trim() !== guardado.otro);

  async function guardar() {
    setError(null);
    setOperacion(null);
    setPendiente(true);
    try {
      // Petición normal con tiempo máximo (25 s): nunca deja la pantalla cargando indefinidamente.
      const res = await llamar<{ operacionId?: string }>('cambiarEstadoPropiedad', [id, valor, valor === 'otro' ? otro : null]);
      if (res.ir) { window.location.assign(res.ir); return; }
      if (res.error) { setError(res.error); setPendiente(false); return; }
      // Se recarga la ficha con un enlace normal (nunca se queda esperando) para mostrar el estado nuevo.
      // Si se creó una operación, el aviso con el botón para completarla aparece al recargar.
      const url = new URL(window.location.href);
      url.searchParams.delete('nueva');
      if (res.operacionId) url.searchParams.set('nueva', res.operacionId);
      window.location.assign(url.pathname + url.search);
      return;
    } catch {
      setError('No se pudo cambiar el estado. Inténtalo de nuevo.');
      setPendiente(false);
    }
  }

  return (
    <section className="card !p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label className="label" htmlFor="estado-rapido">Estado de la propiedad</label>
          <select id="estado-rapido" className="input" value={valor} onChange={(e) => setValor(e.target.value)}>
            {Object.entries(ESTADOS_PROPIEDAD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {valor === 'otro' && (
          <div className="sm:w-64">
            <label className="label" htmlFor="estado-otro">¿Cuál?</label>
            <input id="estado-otro" className="input" maxLength={60} placeholder="Ej.: En litigio" value={otro} onChange={(e) => setOtro(e.target.value)} />
          </div>
        )}
        <button type="button" onClick={guardar} disabled={!cambio || pendiente} className="btn btn-sm sm:mb-0.5">
          <RefreshCw className={`h-4 w-4 ${pendiente ? 'animate-spin' : ''}`} /> {pendiente ? 'Actualizando…' : 'Actualizar estado'}
        </button>
      </div>
      {operacion && (
        <div role="status" className="mt-3 flex flex-col gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm ring-1 ring-emerald-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-medium text-emerald-800">
            <Handshake className="h-4 w-4 shrink-0" />
            {operacion.creada ? 'Operación registrada automáticamente con los datos de la propiedad.' : 'Ya había una operación de hoy para esta propiedad.'}
          </p>
          <Link href={`/operaciones/${operacion.id}/editar?volver=${id}`} className="btn btn-sm shrink-0">Completar comisión y forma de pago</Link>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
    </section>
  );
}
