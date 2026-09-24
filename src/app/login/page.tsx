'use client';
import { Suspense, useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { iniciarSesion } from './actions';
import { useIr } from '@/lib/useIr';
import Logo from '@/components/Logo';

function LoginForm() {
  const params = useSearchParams();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const motivo = params.get('error');
  const [resultado, accion, cargando] = useActionState(iniciarSesion, null);
  useIr(resultado);
  const error = resultado?.error ?? (motivo === 'inactivo' ? 'Tu usuario está desactivado.' : null);
  const aviso = motivo === 'expirada' ? 'Tu sesión se cerró por inactividad. Ingresa de nuevo.' : null;

  return (
    <form action={accion} className="mt-8 space-y-5">
      <div>
        <label className="label" htmlFor="usuario">Usuario o correo</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><User className="h-4 w-4" /></span>
          <input id="usuario" name="usuario" className="input !pl-10" placeholder="tu usuario o correo" autoComplete="username" autoCapitalize="none" required
            value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><Lock className="h-4 w-4" /></span>
          <input id="password" name="password" className="input !px-10" type={ver ? 'text' : 'password'} autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-2 rounded-lg px-2 text-slate-400 hover:text-slate-700">
            {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {aviso && !error && <p role="status" className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700 ring-1 ring-amber-100">{aviso}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
      <button className="btn w-full !min-h-[3rem] text-base" disabled={cargando}>
        {cargando ? 'Ingresando…' : <>Ingresar <ChevronRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca (escritorio) */}
      <section className="relative hidden overflow-hidden bg-ink-900 lg:flex lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[34rem] w-[34rem] animate-float rounded-full bg-brand-500/40 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] animate-float rounded-full bg-violet-500/30 blur-[120px]" style={{ animationDelay: '-6s' }} />
        <div className="pointer-events-none absolute inset-0 opacity-[.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(70% 60% at 50% 50%,#000,transparent)', WebkitMaskImage: 'radial-gradient(70% 60% at 50% 50%,#000,transparent)' }} />

        <div className="relative z-10 flex max-w-lg flex-col items-center px-10 text-center animate-rise">
          <Logo size="xl" vertical />
          <span className="mt-10 h-px w-24 bg-gradient-to-r from-transparent via-brand-300/70 to-transparent" />
          <h1 className="mt-8 !text-xl !font-semibold !uppercase !leading-relaxed !tracking-[.32em] !text-slate-200">
            Sistema inmobiliario<br />de control
          </h1>
        </div>
      </section>

      {/* Formulario */}
      <section className="relative flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50/60 p-5 sm:p-10">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex flex-col items-center gap-4 text-center lg:hidden">
            <Logo dark={false} size="lg" vertical />
            <p className="text-[11px] font-semibold uppercase tracking-[.28em] text-slate-500">Sistema inmobiliario de control</p>
          </div>
          <div className="rounded-3xl bg-white p-7 shadow-lift ring-1 ring-slate-200/60 sm:p-9">
            <h1 className="!text-2xl">Bienvenido</h1>
            <p className="mt-1 text-sm text-slate-500">Ingresa con tu usuario o correo y tu contraseña.</p>
            <Suspense><LoginForm /></Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
