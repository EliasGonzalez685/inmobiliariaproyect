'use client';
import { useActionState } from 'react';
import { KeyRound, Mail, Save, User, UserRound } from 'lucide-react';
import Aviso from '@/components/Aviso';
import PasswordInput from '@/components/PasswordInput';
import { cambiarClave, guardarDatosPersonales } from './actions';
import { useIr } from '@/lib/useIr';

export function DatosForm({ nombre, usuario, correo }: { nombre: string; usuario: string; correo: string }) {
  const [res, accion, pendiente] = useActionState(guardarDatosPersonales, null);
  return (
    <form action={accion} className="card space-y-4">
      <div className="flex items-center gap-3">
        <span className="icon-chip bg-brand-50 text-brand-600"><UserRound className="h-5 w-5" /></span>
        <div><h2>Datos personales</h2><p className="text-sm text-slate-500">Así te identificas al ingresar al sistema.</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" className="input" required defaultValue={nombre} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="usuario">Nombre de usuario</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><User className="h-4 w-4" /></span>
            <input id="usuario" name="usuario" className="input !pl-10" required defaultValue={usuario} autoComplete="username"
              autoCapitalize="none" spellCheck={false} minLength={3} maxLength={30} pattern="[A-Za-z0-9._\-]{3,30}" />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Letras, números, punto, guion o guion bajo. Puede ser un nombre o un número.</p>
        </div>
        <div>
          <label className="label" htmlFor="correo">Correo (opcional)</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><Mail className="h-4 w-4" /></span>
            <input id="correo" name="correo" type="email" className="input !pl-10" defaultValue={correo} autoComplete="email" autoCapitalize="none" />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">También podrás ingresar con este correo.</p>
        </div>
      </div>
      <Aviso resultado={res} />
      <button className="btn w-full sm:w-auto" disabled={pendiente}><Save className="h-4 w-4" /> {pendiente ? 'Guardando…' : 'Guardar datos'}</button>
    </form>
  );
}

export function ClaveForm({ forzar }: { forzar: boolean }) {
  const [res, accion, pendiente] = useActionState(cambiarClave, null);
  useIr(res);
  return (
    <form action={accion} className="card space-y-4">
      <input type="hidden" name="forzar" value={forzar ? '1' : '0'} />
      <div className="flex items-center gap-3">
        <span className="icon-chip bg-violet-50 text-violet-600"><KeyRound className="h-5 w-5" /></span>
        <div><h2>Cambiar contraseña</h2><p className="text-sm text-slate-500">Mínimo 8 caracteres. Se cerrará tu sesión en otros dispositivos.</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label" htmlFor="actual">Contraseña actual</label><PasswordInput name="actual" id="actual" autoComplete="current-password" /></div>
        <div><label className="label" htmlFor="nueva">Nueva contraseña</label><PasswordInput name="nueva" id="nueva" autoComplete="new-password" minLength={8} /></div>
        <div><label className="label" htmlFor="confirmar">Repetir nueva contraseña</label><PasswordInput name="confirmar" id="confirmar" autoComplete="new-password" minLength={8} /></div>
      </div>
      <Aviso resultado={res} />
      <button className="btn w-full sm:w-auto" disabled={pendiente}><KeyRound className="h-4 w-4" /> {pendiente ? 'Actualizando…' : 'Cambiar contraseña'}</button>
    </form>
  );
}
