import Link from '@/components/LinkSeguro';
import { Building2, Mail, Phone, Plus, Search, Users } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { etiquetaCliente } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const GRADIENTES = ['from-brand-400 to-violet-500', 'from-sky-400 to-cyan-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500'];
const gradiente = (s: string) => GRADIENTES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTES.length];

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from('clientes').select('id, nombre, tipo, tipo_otro, telefono, email, documento, propiedades(id)').order('nombre');
  if (q) {
    const s = q.replace(/[%,()]/g, ' ').trim();
    query = query.or(`nombre.ilike.%${s}%,documento.ilike.%${s}%,telefono.ilike.%${s}%,email.ilike.%${s}%`);
  }
  const [, { data: clientes }] = await Promise.all([requireProfile(), query]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div><h1>Clientes</h1><p className="text-sm text-slate-500">{clientes?.length ?? 0} registrados</p></div>
        <Link href="/clientes/nuevo" className="btn hidden sm:inline-flex"><Plus className="h-4 w-4" /> Nuevo cliente</Link>
      </div>

      <form className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"><Search className="h-4 w-4" /></span>
          <input className="input !min-h-[3rem] !rounded-2xl !pl-11" name="q" defaultValue={q} placeholder="Buscar por nombre, documento, teléfono…" />
        </div>
        <button className="btn !min-h-[3rem] !rounded-2xl !px-4 sm:!px-6" aria-label="Buscar"><Search className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Buscar</span></button>
      </form>

      {clientes && clientes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clientes.map((c) => {
            const n = (c.propiedades as unknown[]).length;
            return (
              <div key={c.id} className="card card-hover">
                <Link href={`/clientes/${c.id}`} className="flex items-center gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradiente(c.nombre)} text-lg font-bold text-white shadow-soft`}>{c.nombre[0].toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.nombre}</p>
                    <p className="truncate text-xs text-slate-500">{etiquetaCliente(c)}{c.documento && ` · ${c.documento}`}</p>
                  </div>
                </Link>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="badge bg-brand-50 text-brand-700"><Building2 className="h-3.5 w-3.5" /> {n} propiedad{n === 1 ? '' : 'es'}</span>
                  <div className="flex gap-2">
                    {c.telefono && <a href={`tel:${c.telefono}`} aria-label="Llamar" className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"><Phone className="h-4 w-4" /></a>}
                    {c.email && <a href={`mailto:${c.email}`} aria-label="Enviar correo" className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100"><Mail className="h-4 w-4" /></a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center py-14 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><Users className="h-5 w-5" /></span>
          <h2 className="mt-4">{q ? 'Sin resultados' : 'Aún no hay clientes'}</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">{q ? 'Prueba con otra búsqueda.' : 'Registra propietarios, inquilinos o compradores para vincularlos a sus inmuebles.'}</p>
          <Link href="/clientes/nuevo" className="btn mt-5"><Plus className="h-4 w-4" /> Nuevo cliente</Link>
        </div>
      )}
    </div>
  );
}
