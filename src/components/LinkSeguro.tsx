import type { AnchorHTMLAttributes } from 'react';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  // Se aceptan (y se ignoran) las opciones de next/link para poder sustituirlo sin tocar cada uso.
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
};

/**
 * Enlace normal del navegador (sin el enrutador de Next.js).
 * El enrutador a veces dejaba los clics sin respuesta; un enlace común siempre abre la página.
 */
export default function LinkSeguro({ prefetch: _p, replace: _r, scroll: _s, ...props }: Props) {
  return <a {...props} />;
}
