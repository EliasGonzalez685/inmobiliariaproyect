'use client';
import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function PasswordInput({ name, id, autoComplete, minLength, defaultValue, value, onChange, required = true }: {
  name: string;
  id?: string;
  autoComplete?: string;
  minLength?: number;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
}) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><Lock className="h-4 w-4" /></span>
      <input id={id ?? name} name={name} className="input !px-10" type={ver ? 'text' : 'password'}
        autoComplete={autoComplete} minLength={minLength} required={required}
        {...(value !== undefined ? { value, onChange: (e) => onChange?.(e.target.value) } : { defaultValue })} />
      <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute inset-y-0 right-2 rounded-lg px-2 text-slate-400 hover:text-slate-700">
        {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
