import { requireCuenta } from '@/lib/auth';
import Nav from '@/components/Nav';
import IndicadorNavegacion from '@/components/IndicadorNavegacion';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireCuenta();
  const nombre = profile.nombre || profile.usuario || 'Usuario';
  return (
    <div className="min-h-screen lg:flex">
      <IndicadorNavegacion />
      <Nav nombre={nombre} detalle={profile.rol === 'super_admin' ? 'Super administrador' : 'Equipo'} rol={profile.rol} bloqueado={!!profile.debe_cambiar_clave} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-6xl animate-rise px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}
