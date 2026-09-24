'use client';
import { useState } from 'react';
import { FileBadge, FileText, FolderOpen, Landmark, Map as MapIcon, ShieldCheck, Upload, Trash2, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TIPOS_DOCUMENTO } from '@/lib/constants';
import { diasHasta, formatoFecha, tonoVencimiento } from '@/lib/format';

export type Documento = { id: string; nombre: string; tipo: string; storage_path: string; url: string | null; fecha_emision: string | null; fecha_vencimiento: string | null; notas: string | null };

const limpiar = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_');

export default function DocumentosManager({ propiedadId, documentos }: { propiedadId: string; documentos: Documento[] }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const archivo = fd.get('archivo');
    if (!(archivo instanceof File) || archivo.size === 0) return;
    setSubiendo(true);
    setError(null);
    const supabase = createClient();
    const path = `${propiedadId}/${crypto.randomUUID()}-${limpiar(archivo.name)}`;
    const { error: e1 } = await supabase.storage.from('documentos').upload(path, archivo, { contentType: archivo.type || undefined });
    if (e1) { setError(e1.message); setSubiendo(false); return; }
    const { error: e2 } = await supabase.from('propiedad_documentos').insert({
      propiedad_id: propiedadId,
      storage_path: path,
      tipo: String(fd.get('tipo')),
      nombre: String(fd.get('nombre') ?? '').trim() || archivo.name,
      fecha_emision: String(fd.get('fecha_emision') ?? '') || null,
      fecha_vencimiento: String(fd.get('fecha_vencimiento') ?? '') || null,
      notas: String(fd.get('notas') ?? '').trim() || null,
    });
    if (e2) { await supabase.storage.from('documentos').remove([path]); setError(e2.message); setSubiendo(false); return; }
    form.reset();
    setNombreArchivo('');
    setSubiendo(false);
    window.location.reload();
  }

  async function eliminar(d: Documento) {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from('documentos').remove([d.storage_path]);
    await supabase.from('propiedad_documentos').delete().eq('id', d.id);
    window.location.reload();
  }

  const ICONOS: Record<string, typeof FileText> = { escritura: FileBadge, titulo: Landmark, plano: MapIcon, seguro: ShieldCheck };

  return (
    <div className="space-y-5">
      <form onSubmit={subir} className="card space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-7 text-center transition hover:border-brand-400 hover:bg-brand-50">
          <span className="icon-chip bg-white text-brand-600 shadow-soft"><Upload className="h-5 w-5" /></span>
          <span className="max-w-full truncate font-semibold text-slate-800">{nombreArchivo || 'Toca para elegir un documento'}</span>
          <span className="text-xs text-slate-500">PDF, imágenes, Word… (hasta 25 MB)</span>
          <input type="file" name="archivo" required className="sr-only" onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? '')} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" name="tipo">{Object.entries(TIPOS_DOCUMENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div className="sm:col-span-1 lg:col-span-3">
            <label className="label">Nombre</label>
            <input className="input" name="nombre" placeholder="Si lo dejas vacío usa el del archivo" />
          </div>
          <div><label className="label">Fecha de emisión</label><input className="input" type="date" name="fecha_emision" /></div>
          <div><label className="label">Fecha de vencimiento</label><input className="input" type="date" name="fecha_vencimiento" /></div>
          <div className="sm:col-span-2"><label className="label">Notas</label><input className="input" name="notas" /></div>
        </div>
        <button className="btn w-full sm:w-auto" disabled={subiendo || !nombreArchivo}>{subiendo ? 'Subiendo…' : 'Subir documento'}</button>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">{error}</p>}
      </form>

      {documentos.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><FolderOpen className="h-5 w-5" /></span>
          <p className="mt-3 font-semibold text-slate-800">No hay documentos cargados</p>
          <p className="text-sm text-slate-500">Escrituras, planos, contratos y comprobantes en un solo lugar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {documentos.map((d) => {
            const dias = d.fecha_vencimiento ? diasHasta(d.fecha_vencimiento) : null;
            const t = dias !== null ? tonoVencimiento(dias) : null;
            const Icono = ICONOS[d.tipo] ?? FileText;
            return (
              <div key={d.id} className="card !p-4">
                <div className="flex items-center gap-3">
                  <span className="icon-chip bg-brand-50 text-brand-600"><Icono className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{d.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      {TIPOS_DOCUMENTO[d.tipo as keyof typeof TIPOS_DOCUMENTO]}
                      {d.fecha_emision && ` · Emitido ${formatoFecha(d.fecha_emision)}`}
                      {d.fecha_vencimiento && ` · Vence ${formatoFecha(d.fecha_vencimiento)}`}
                    </p>
                  </div>
                  {t && dias !== null && <span className={`badge shrink-0 ${t.clase}`}>{dias < 0 ? 'Vencido' : `${dias} d`}</span>}
                </div>
                {d.notas && <p className="mt-2 text-xs text-slate-500">{d.notas}</p>}
                <div className="mt-3 flex gap-2">
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm flex-1"><ExternalLink className="h-3.5 w-3.5" /> Abrir</a>}
                  <button onClick={() => eliminar(d)} className="btn-danger btn-sm" aria-label="Eliminar documento"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
