'use client';
import { useEffect, useState } from 'react';

/**
 * Da respuesta visual inmediata al tocar cualquier enlace interno: barra de progreso arriba y la pantalla
 * se atenúa un poco mientras el servidor prepara la página siguiente. Así nunca parece que se quedó trabado.
 */
export default function IndicadorNavegacion() {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    const raiz = document.documentElement;
    let reloj: ReturnType<typeof setTimeout> | undefined;
    const parar = () => { clearTimeout(reloj); setActivo(false); raiz.classList.remove('navegando'); };
    const iniciar = () => {
      setActivo(true);
      raiz.classList.add('navegando');
      clearTimeout(reloj);
      reloj = setTimeout(parar, 20000); // por si la navegación se cancela
    };

    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.hash && url.pathname === location.pathname && url.search === location.search) return;
      iniciar();
    };

    window.addEventListener('click', alTocar);
    window.addEventListener('pageshow', parar); // al volver atrás desde el historial
    return () => { window.removeEventListener('click', alTocar); window.removeEventListener('pageshow', parar); clearTimeout(reloj); raiz.classList.remove('navegando'); };
  }, []);

  return activo ? <div className="barra-navegacion" role="progressbar" aria-label="Cargando la página" /> : null;
}
