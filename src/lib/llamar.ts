'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Respuesta = { error?: string; ok?: string; ir?: string; [k: string]: any };

const ESPERA_MS = 25000;

/**
 * Llama a una acción del servidor con un fetch normal (sin pasar por el enrutador de Next.js).
 * Nunca queda esperando: si el servidor no responde en 25 s se corta y se avisa.
 */
export async function llamar<T extends Respuesta = Respuesta>(nombre: string, args: unknown[] = [], datos?: FormData | null): Promise<T & Respuesta> {
  const cuerpo = datos ?? new FormData();
  cuerpo.set('__args', JSON.stringify(args));
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  try {
    const r = await fetch(`/api/accion/${nombre}`, { method: 'POST', body: cuerpo, credentials: 'same-origin', signal: control.signal, cache: 'no-store' });
    // Sesión vencida: el middleware responde con una redirección al login.
    if (r.redirected && new URL(r.url).pathname.startsWith('/login')) return { ir: "/login" } as T & Respuesta;
    const tipo = r.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) return { error: 'Respuesta inesperada del servidor. Inténtalo de nuevo.' } as T & Respuesta;
    return (await r.json()) as T & Respuesta;
  } catch (e) {
    const cortado = (e as Error)?.name === 'AbortError';
    return { error: cortado ? 'El servidor no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.' : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' } as T & Respuesta;
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Formulario que se envía con `llamar`: devuelve [resultado, onSubmit, pendiente].
 * Si la acción indica una dirección (`ir`), se abre con navegación directa del navegador.
 */
export function useAccion<T extends Respuesta = Respuesta>(nombre: string, args: unknown[] = []) {
  const [res, setRes] = useState<T | null>(null);
  const [pendiente, setPendiente] = useState(false);
  const ocupado = useRef(false);
  const argsRef = useRef(args);
  argsRef.current = args;

  const enviar = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ocupado.current) return;
    ocupado.current = true;
    setPendiente(true);
    setRes(null);
    const r = await llamar<T>(nombre, argsRef.current, new FormData(e.currentTarget));
    if (r.ir) { window.location.assign(r.ir); return; } // se mantiene "Guardando…" hasta que cargue la página siguiente
    ocupado.current = false;
    setRes(r);
    setPendiente(false);
  }, [nombre]);

  // Si se vuelve a esta pantalla con "Atrás", el botón no debe quedar en "Guardando…".
  useEffect(() => {
    const volver = (e: PageTransitionEvent) => { if (e.persisted) { ocupado.current = false; setPendiente(false); } };
    window.addEventListener('pageshow', volver);
    return () => window.removeEventListener('pageshow', volver);
  }, []);

  return [res, enviar, pendiente] as const;
}
