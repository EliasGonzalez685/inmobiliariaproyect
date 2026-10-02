'use client';
import { useActionState, useEffect, useState } from 'react';
import { Building2, Dices, Plus, ShieldCheck, ShieldOff, Trash2, UserPlus } from 'lucide-react';
import Aviso from '@/components/Aviso';
import ConfirmForm from '@/components/ConfirmForm';
import UsuarioCard, { type UsuarioSoporte } from './UsuarioCard';
import { cambiarEstadoEmpresa, crearCuenta, eliminarEmpresa } from './actions';

export type EmpresaSoporte = { id: string; nombre: string; activo: boolean; cantidad_usuarios: number };

function generarClave() {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

function NuevaCuenta({ empresaId, alCrear }: { empresaId: string; alCrear: () => void }) {
  const [res, accion, pendiente] = useActionState(crearCuenta, null);
  const [clave, setClave] = useState('');
  return (
    <form action={accion} className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
      <input type="hidden" name="empresa_id" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`nu-usr-${empresaId}`}>Nombre de usuario</label>
          <input id={`nu-usr-${empresaId}`} name="usuario" className="input" required autoCapitalize="none" spellCheck={false} placeholder="p. ej. maria" />
        </div>
        <div>
          <label className="label" htmlFor={`nu-nom-${empresaId}`}>Nombre de la persona</label>
          <input id={`nu-nom-${empresaId}`} name="nombre" className="input" required placeholder="María Benítez" />
        </div>
        <div>
          <label className="label" htmlFor={`nu-mail-${empresaId}`}>Correo (opcional)</label>
          <input id={`nu-mail-${empresaId}`} name="correo" type="email" className="input" autoCapitalize="none" />
        </div>
        <div>
          <label className="label" htmlFor={`nu-clave-${empresaId}`}>Contraseña temporal</label>
          <div className="flex gap-2">
            <input id={`nu-clave-${empresaId}`} name="clave" className="input font-mono" required minLength={8} autoComplete="off"
              value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Mínimo 8 caracteres" />
            <button type="button" onClick={() => setClave(generarClave())} className="btn-secondary shrink-0 !px-3" title="Generar una contraseña aleatoria" aria-label="Generar contraseña">
              <Dices className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <Aviso resultado={res} />
      <button className="btn btn-sm" disabled={pendiente}><UserPlus className="h-4 w-4" /> {pendiente ? 'Creando…' : 'Crear cuenta'}</button>
      {res?.ok && (
        <button type="button" onClick={alCrear} className="btn-secondary btn-sm">Listo, cerrar</button>
      )}
    </form>
  );
}

// Solo se ofrece eliminar cuando la empresa no tiene ninguna cuenta (la función SQL lo exige igual); es irreversible.
function EliminarEmpresa({ id, nombre }: { id: string; nombre: string }) {
  const [res, accion, pendiente] = useActionState(eliminarEmpresa, null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (res?.ok && typeof window !== 'undefined') window.location.reload();
  }, [res]);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="btn-danger btn-sm">
        <Trash2 className="h-4 w-4" /> Eliminar
      </button>
    );
  }

  return (
    <form action={accion} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">¿Eliminar &quot;{nombre}&quot;? No se puede deshacer.</span>
        <button type="button" onClick={() => setConfirmando(false)} className="btn-secondary btn-sm" disabled={pendiente}>Cancelar</button>
        <button className="btn-danger btn-sm" disabled={pendiente}><Trash2 className="h-4 w-4" /> {pendiente ? 'Eliminando…' : 'Sí, eliminar'}</button>
      </div>
      {res?.error && <p role="alert" className="text-xs font-medium text-red-600">{res.error}</p>}
    </form>
  );
}

export default function EmpresaCard({ empresa, usuarios }: { empresa: EmpresaSoporte; usuarios: UsuarioSoporte[] }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <article className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-chip bg-violet-50 text-violet-600"><Building2 className="h-5 w-5" /></span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2">
              {empresa.nombre}
              <span className={`badge badge-dot ${empresa.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{empresa.activo ? 'Activa' : 'Desactivada'}</span>
            </h2>
            <p className="text-sm text-slate-500">{empresa.cantidad_usuarios} {empresa.cantidad_usuarios === 1 ? 'usuario' : 'usuarios'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAbierta((v) => !v)} className={`btn-secondary btn-sm ${abierta ? '!border-brand-400 !text-brand-700' : ''}`}>
            <Plus className="h-4 w-4" /> Agregar usuario
          </button>
          {empresa.activo ? (
            <ConfirmForm action={cambiarEstadoEmpresa.bind(null, empresa.id, false)} mensaje="¿Desactivar esta empresa? Sus usuarios dejarán de poder ingresar." className="btn-danger btn-sm">
              <ShieldOff className="h-4 w-4" /> Desactivar
            </ConfirmForm>
          ) : (
            <form action={cambiarEstadoEmpresa.bind(null, empresa.id, true)}>
              <button className="btn btn-sm"><ShieldCheck className="h-4 w-4" /> Activar</button>
            </form>
          )}
          {empresa.cantidad_usuarios === 0 && <EliminarEmpresa id={empresa.id} nombre={empresa.nombre} />}
        </div>
      </div>

      {abierta && <NuevaCuenta empresaId={empresa.id} alCrear={() => setAbierta(false)} />}

      {usuarios.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {usuarios.map((u) => <UsuarioCard key={u.id} u={u} />)}
        </div>
      )}
    </article>
  );
}
