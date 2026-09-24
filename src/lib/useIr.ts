'use client';
import { useEffect } from 'react';

/** Cuando una acción del servidor indica una dirección (`ir`), se abre con navegación directa del navegador. */
export function useIr(res: { ir?: string } | null | undefined) {
  useEffect(() => {
    if (res?.ir) window.location.assign(res.ir);
  }, [res]);
}
