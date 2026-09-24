import { House } from 'lucide-react';

const TAMANOS = {
  md: { caja: 'h-11 w-11 rounded-2xl', icono: 'h-6 w-6', marca: 'text-[15px]', sub: 'text-[11px]' },
  lg: { caja: 'h-14 w-14 rounded-2xl', icono: 'h-7 w-7', marca: 'text-xl', sub: 'text-xs' },
  xl: { caja: 'h-24 w-24 rounded-[1.75rem]', icono: 'h-12 w-12', marca: 'text-4xl', sub: 'text-sm' },
} as const;

export default function Logo({ dark = true, size = 'md', vertical = false }: { dark?: boolean; size?: keyof typeof TAMANOS; vertical?: boolean }) {
  const t = TAMANOS[size];
  return (
    <div className={`flex items-center ${vertical ? 'flex-col gap-5 text-center' : 'gap-3'}`}>
      <span className={`flex ${t.caja} items-center justify-center bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-glow ring-1 ring-white/20`}>
        <House className={t.icono} />
      </span>
      <div className="leading-tight">
        <p className={`${t.marca} font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>INMOBILIARIA</p>
        <p className={`${t.sub} font-semibold uppercase tracking-[.4em] ${dark ? 'text-brand-300' : 'text-brand-600'}`}>Proyect</p>
      </div>
    </div>
  );
}
