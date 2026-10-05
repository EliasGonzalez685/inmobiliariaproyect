'use client';
import Link from '@/components/LinkSeguro';
import { usePathname } from 'next/navigation';
import { Building2, ClipboardList, Handshake, LayoutDashboard, LifeBuoy, LogOut, Plus, UserRound, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Logo from './Logo';

type Enlace = { href: string; label: string; icon: typeof LayoutDashboard };

const enlacesEquipo: Enlace[] = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/operaciones', label: 'Operaciones', icon: Handshake },
];
const enlaceSoporte: Enlace = { href: '/soporte', label: 'Soporte', icon: LifeBuoy };
const enlaceCuenta: Enlace = { href: '/cuenta', label: 'Mi cuenta', icon: UserRound };

function titulo(pathname: string, links: Enlace[]) {
  if (pathname.startsWith('/propiedades/')) return 'Propiedad';
  if (pathname.startsWith('/clientes/')) return 'Cliente';
  if (pathname.startsWith('/pedidos/')) return 'Pedido';
  if (pathname.startsWith('/operaciones/')) return 'Operación';
  if (pathname.startsWith(enlaceCuenta.href)) return enlaceCuenta.label;
  return links.find((l) => (l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)))?.label ?? '';
}

export default function Nav({ nombre, detalle, rol, bloqueado }: { nombre: string; detalle: string; rol: 'super_admin' | 'usuario'; bloqueado: boolean }) {
  // El super administrador solo ve soporte; el personal ve el trabajo diario.
  // Si debe cambiar su contraseña, solo puede ir a "Mi cuenta" (ahí sigue siendo la única opción).
  const trabajo = rol === 'super_admin' ? [enlaceSoporte] : bloqueado ? [] : enlacesEquipo;
  // "Mi cuenta" queda aparte, junto al botón de cerrar sesión, en vez de mezclada con el resto.
  const links = bloqueado ? [enlaceCuenta] : trabajo;
  const pathname = usePathname();
  const activo = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const inicial = (nombre[0] ?? '?').toUpperCase();
  const mostrarFab = rol === 'usuario' && !bloqueado && (pathname === '/' || pathname === '/propiedades');

  async function salir() {
    await createClient().auth.signOut();
    window.location.assign('/login');
  }

  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-ink-900 p-5 lg:flex"
        style={{ backgroundImage: 'radial-gradient(60% 40% at 0% 0%,rgba(99,102,241,.28),transparent 70%)' }}>
        <div className="mb-8 px-1"><Logo /></div>
        <p className="mb-2 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{rol === 'super_admin' ? 'Administración' : 'Gestión'}</p>
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${activo(href) ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              {activo(href) && <span className="absolute -left-5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />}
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <Link href={enlaceCuenta.href}
            className={`flex items-center gap-3 rounded-xl p-1.5 transition ${activo(enlaceCuenta.href) ? 'bg-white/10' : 'hover:bg-white/5'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-violet-500 text-sm font-bold text-white">{inicial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{nombre}</p>
              <p className="truncate text-xs text-slate-400">{detalle}</p>
            </div>
          </Link>
          <Link href={enlaceCuenta.href}
            className={`flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition ${activo(enlaceCuenta.href) ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <UserRound className="h-4 w-4" /> Mi cuenta
          </Link>
          <button onClick={salir} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Móvil / tablet: barra superior */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">{inicial}</span>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">{titulo(pathname, links)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href={enlaceCuenta.href} aria-label="Mi cuenta"
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${activo(enlaceCuenta.href) ? 'text-brand-600' : 'text-slate-500'} hover:bg-slate-100`}>
            <UserRound className="h-5 w-5" />
          </Link>
          <button onClick={salir} aria-label="Cerrar sesión" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mostrarFab && (
        <Link href="/propiedades/nueva" aria-label="Nueva propiedad"
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow transition active:scale-95 lg:hidden">
          <Plus className="h-6 w-6" />
        </Link>
      )}

      {/* Móvil / tablet: barra inferior */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${activo(href) ? 'text-brand-600' : 'text-slate-400'}`}>
              {activo(href) && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-brand-600" />}
              <Icon className="h-[22px] w-[22px]" />{label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
