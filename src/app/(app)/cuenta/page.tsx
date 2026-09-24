import { ShieldAlert } from 'lucide-react';
import { requireCuenta } from '@/lib/auth';
import { ClaveForm, DatosForm } from './CuentaForms';

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ forzar?: string }> }) {
  const { profile } = await requireCuenta();
  const { forzar } = await searchParams;
  const obligatorio = profile.debe_cambiar_clave || forzar === '1';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1>Mi cuenta</h1>
        <p className="mt-1 text-slate-500">Administra tus datos de acceso.</p>
      </div>

      {obligatorio && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p><b>Crea una contraseña nueva para continuar.</b> El administrador restableció tu acceso con una contraseña temporal; escríbela como “contraseña actual” y elige la tuya.</p>
        </div>
      )}

      {!obligatorio && (
        <DatosForm nombre={profile.nombre ?? ''} usuario={profile.usuario ?? ''} correo={profile.email_contacto ?? ''} />
      )}
      <ClaveForm forzar={obligatorio} />
    </div>
  );
}
