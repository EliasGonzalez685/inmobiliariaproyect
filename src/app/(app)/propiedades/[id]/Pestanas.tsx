'use client';
import { useState, type ReactNode } from 'react';
import { Camera, FileText, FolderOpen, Handshake, Wrench } from 'lucide-react';

const ICONOS = { ficha: FileText, fotos: Camera, documentos: FolderOpen, mantenimiento: Wrench, operaciones: Handshake } as const;

type Pestana = { k: keyof typeof ICONOS; l: string; n: number | null; contenido: ReactNode };

/**
 * Pestañas de la ficha. Todo el contenido llega junto con la página, así que al cambiar de pestaña
 * solo se muestra u oculta: es instantáneo y no depende de ninguna navegación ni del servidor.
 */
export default function Pestanas({ inicial, tabs }: { inicial: string; tabs: Pestana[] }) {
  const [activa, setActiva] = useState<string>(tabs.some((t) => t.k === inicial) ? inicial : 'ficha');

  function elegir(k: string) {
    setActiva(k);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', k);
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    } catch { /* la dirección es solo un extra: si falla, la pestaña igual cambia */ }
  }

  return (
    <>
      <div className="no-scrollbar sticky top-[61px] z-20 -mx-4 flex gap-2 overflow-x-auto bg-slate-50/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 lg:top-0" role="tablist">
        {tabs.map(({ k, l, n }) => {
          const Icon = ICONOS[k];
          const on = activa === k;
          return (
            <button key={k} type="button" role="tab" aria-selected={on} onClick={() => elegir(k)} className={`pill shrink-0 ${on ? 'pill-active' : ''}`}>
              <Icon className="h-4 w-4" />{l}
              {n ? <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-white/25' : 'bg-slate-100'}`}>{n}</span> : null}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => <div key={t.k} hidden={activa !== t.k} role="tabpanel">{t.contenido}</div>)}
    </>
  );
}
