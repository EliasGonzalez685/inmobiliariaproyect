'use client';
import { useActionState, useState } from 'react';
import { Clock, Dices, KeyRound, LockKeyhole, LockOpen, Pencil, Save, ShieldCheck, ShieldOff } from 'lucide-react';
import Aviso from '@/components/Aviso';
import ConfirmForm from '@/components/ConfirmForm';
import { cambiarEstado, desbloquear, editarDatos, restablecerClave } from './actions';

export type UsuarioSoporte = {
  id: string;
  usuario: string | null;
  nombre: string | null;
  email_contacto: string | null;
  activo: boolean;
  debe_cambiar_clave: boolean;
  ultimo_acceso: string | null;
  bloqueado_hasta: string | null;
};

function generarClave() {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

function fechaHora(v: string | null) {
  if (!v) return 'Nunca ingresó';
  return new Date(v).toLocaleString('es-PY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Asuncion' });
}

function RestablecerClave({ id }: { id: string }) {
  const [res, accion, pendiente] = useActionState(restablecerClave, null);
  const [clave, setClave] = useState('');
  return (
    <form action={accion} className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor={`clave-${id}`}>Contraseña temporal</label>
        <div className="flex gap-2">
          <input id={`clave-${id}`} name="clave" className="input font-mono" required minLength={8} autoComplete="off"
            value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Mínimo 8 caracteres" />
          <button type="button" onClick={() => setClave(generarClave())} className="btn-secondary shrink-0 !px-3" title="Generar una contraseña aleatoria" aria-label="Generar contraseña">
            <Dices className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">La persona deberá reemplazarla por la suya al ingresar. Se cerrarán sus sesiones abiertas.</p>
      </div>
      <Aviso resultado={res} />
      <button className="btn btn-sm" disabled={pendiente}><KeyRound className="h-4 w-4" /> {pendiente ? 'Restableciendo…' : 'Restablecer contraseña'}</button>
    </form>
  );
}

function EditarDatos({ u }: { u: UsuarioSoporte }) {
  const [res, accion, pendiente] = useActionState(editarDatos, null);
  return (
    <form action={accion} className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
      <input type="hidden" name="id" value={u.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`usr-${u.id}`}>Nombre de usuario</label>
          <input id={`usr-${u.id}`} name="usuario" className="input" required defaultValue={u.usuario ?? ''} autoCapitalize="none" spellCheck={false} />
        </div>
        <div>
          <label className="label" htmlFor={`mail-${u.id}`}>Correo</label>
          <input id={`mail-${u.id}`} name="correo" type="email" className="input" defaultValue={u.email_contacto ?? ''} autoCapitalize="none" />
        </div>
      </div>
      <Aviso resultado={res} />
      <button className="btn btn-sm" disabled={pendiente}><Save className="h-4 w-4" /> {pendiente ? 'Guardando…' : 'Guardar'}</button>
    </form>
  );
}

export default function UsuarioCard({ u }: { u: UsuarioSoporte }) {
  const [panel, setPanel] = useState<'clave' | 'datos' | null>(null);
  const alternar = (p: 'clave' | 'datos') => setPanel(panel === p ? null : p);
  const inicial = ((u.nombre || u.usuario || '?')[0] ?? '?').toUpperCase();

  return (
    <article className="card space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-violet-500 text-base font-bold text-white">{inicial}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate">{u.nombre || u.usuario || 'Sin nombre'}</h2>
            <span className={`badge badge-dot ${u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span>
            {u.bloqueado_hasta && <span className="badge bg-red-50 text-red-600"><LockKeyhole className="h-3 w-3" /> Bloqueado por intentos fallidos</span>}
            {u.debe_cambiar_clave && <span className="badge bg-amber-50 text-amber-700">Debe cambiar su contraseña</span>}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            Usuario: <b className="font-semibold text-slate-700">{u.usuario ?? '—'}</b>
            {u.email_contacto && <> · {u.email_contacto}</>}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" /> Último acceso: {fechaHora(u.ultimo_acceso)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => alternar('clave')} className={`btn-secondary btn-sm ${panel === 'clave' ? '!border-brand-400 !text-brand-700' : ''}`}><KeyRound className="h-4 w-4" /> Restablecer contraseña</button>
        <button type="button" onClick={() => alternar('datos')} className={`btn-secondary btn-sm ${panel === 'datos' ? '!border-brand-400 !text-brand-700' : ''}`}><Pencil className="h-4 w-4" /> Usuario y correo</button>
        {u.bloqueado_hasta && (
          <form action={desbloquear.bind(null, u.id)}>
            <button className="btn btn-sm"><LockOpen className="h-4 w-4" /> Desbloquear</button>
          </form>
        )}
        {u.activo ? (
          <ConfirmForm action={cambiarEstado.bind(null, u.id, false)} mensaje="¿Desactivar este usuario? No podrá ingresar y se cerrarán sus sesiones." className="btn-danger btn-sm">
            <ShieldOff className="h-4 w-4" /> Desactivar
          </ConfirmForm>
        ) : (
          <form action={cambiarEstado.bind(null, u.id, true)}>
            <button className="btn btn-sm"><ShieldCheck className="h-4 w-4" /> Activar acceso</button>
          </form>
        )}
      </div>

      {panel === 'clave' && <RestablecerClave id={u.id} />}
      {panel === 'datos' && <EditarDatos u={u} />}
    </article>
  );
}

