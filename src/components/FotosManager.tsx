'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Pencil, Play, Save, Star, Trash2, Upload, Video, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIAS_FOTO } from '@/lib/constants';
import { formatoFecha } from '@/lib/format';
import { MAX_VIDEO_MB, subirMedia, type EstadoArchivo } from '@/lib/media';
import ListaArchivos from './ListaArchivos';

export type Foto = {
  id: string; storage_path: string; url: string | null; descripcion: string | null; categoria: string;
  fecha_toma: string; es_portada: boolean; tipo_media: 'foto' | 'video';
};

export default function FotosManager({ propiedadId, fotos }: { propiedadId: string; fotos: Foto[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estados, setEstados] = useState<EstadoArchivo[]>([]);
  const [hayNuevos, setHayNuevos] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [tipoF, setTipoF] = useState<'' | 'foto' | 'video'>('');
  const [filtro, setFiltro] = useState('');
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const abierta = fotos.find((f) => f.id === abiertaId) ?? null;
  const visibles = useMemo(
    () => fotos.filter((f) => (!tipoF || f.tipo_media === tipoF) && (!filtro || f.categoria === filtro)),
    [fotos, tipoF, filtro],
  );
  const nFotos = fotos.filter((f) => f.tipo_media === 'foto').length;
  const nVideos = fotos.length - nFotos;

  const cerrar = () => { setAbiertaId(null); setEditando(false); };
  const mover = (dir: number) => {
    if (!abierta) return;
    const i = visibles.findIndex((f) => f.id === abierta.id);
    const sig = visibles[(i + dir + visibles.length) % visibles.length];
    if (sig) { setAbiertaId(sig.id); setEditando(false); }
  };
  useEffect(() => {
    if (!abierta) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowRight') mover(1);
      if (e.key === 'ArrowLeft') mover(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, visibles]);

  const grupos = useMemo(() => {
    const m = new Map<string, Foto[]>();
    visibles.forEach((f) => m.set(f.fecha_toma, [...(m.get(f.fecha_toma) ?? []), f]));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibles]);

  // Al elegir los archivos se muestran al instante (miniatura + avance real) y empiezan a subirse solos.
  async function elegir(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || subiendo || !formRef.current) return;
    const fd = new FormData(formRef.current);
    setArchivos(files);
    setEstados(files.map(() => ({ estado: 'esperando' as const, progreso: 0 })));
    setErrores([]);
    setHayNuevos(false);
    setSubiendo(true);
    const { subidos, errores: fallos } = await subirMedia(
      createClient(), propiedadId, files,
      { categoria: String(fd.get('categoria')), fecha_toma: String(fd.get('fecha_toma')), descripcion: String(fd.get('descripcion') ?? '') },
      { yaTienePortada: fotos.some((f) => f.es_portada), alArchivo: (i, e) => setEstados((prev) => prev.map((x, j) => (j === i ? e : x))) },
    );
    setErrores(fallos);
    setSubiendo(false);
    if (subidos > 0 && fallos.length === 0) setTimeout(() => window.location.reload(), 900); // se alcanza a ver todo "listo" y se actualiza la galería
    else if (subidos > 0) setHayNuevos(true);
  }

  async function eliminar(f: Foto) {
    if (!confirm(f.tipo_media === 'video' ? '¿Eliminar este video?' : '¿Eliminar esta foto?')) return;
    const supabase = createClient();
    await supabase.storage.from('fotos').remove([f.storage_path]);
    await supabase.from('propiedad_fotos').delete().eq('id', f.id);
    // Si era la portada, la siguiente foto pasa a serlo
    if (f.es_portada) {
      const otra = fotos.find((x) => x.id !== f.id && x.tipo_media === 'foto');
      if (otra) await supabase.from('propiedad_fotos').update({ es_portada: true }).eq('id', otra.id);
    }
    cerrar();
    window.location.reload();
  }

  async function hacerPortada(f: Foto) {
    const supabase = createClient();
    await supabase.from('propiedad_fotos').update({ es_portada: false }).eq('propiedad_id', propiedadId);
    await supabase.from('propiedad_fotos').update({ es_portada: true }).eq('id', f.id);
    window.location.reload();
  }

  async function guardarEdicion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!abierta) return;
    const fd = new FormData(e.currentTarget);
    setGuardando(true);
    const { error } = await createClient().from('propiedad_fotos').update({
      categoria: String(fd.get('categoria')),
      fecha_toma: String(fd.get('fecha_toma')),
      descripcion: String(fd.get('descripcion') ?? '').trim() || null,
    }).eq('id', abierta.id);
    setGuardando(false);
    if (error) { alert('No se pudo guardar los cambios.'); return; }
    setEditando(false);
    window.location.reload();
  }

  const categoriasPresentes = Array.from(new Set(fotos.map((f) => f.categoria)));

  return (
    <div className="space-y-5">
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Categoría</label>
            <select className="input" name="categoria" disabled={subiendo}>{Object.entries(CATEGORIAS_FOTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" name="fecha_toma" defaultValue={new Date().toISOString().slice(0, 10)} required disabled={subiendo} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción (opcional)</label>
            <input className="input" name="descripcion" placeholder="Ej.: Fachada tras pintura" disabled={subiendo} />
          </div>
        </div>
        <label className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-8 text-center transition ${subiendo ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-brand-400 hover:bg-brand-50'}`}>
          <span className="icon-chip bg-white text-brand-600 shadow-soft"><Upload className="h-5 w-5" /></span>
          <span className="font-semibold text-slate-800">{subiendo ? 'Subiendo archivos…' : 'Toca para elegir fotos o videos'}</span>
          <span className="text-xs text-slate-500">Se suben al instante con la categoría y fecha de arriba · Las fotos se optimizan solas · Videos de hasta {MAX_VIDEO_MB} MB</span>
          <input type="file" name="archivos" accept="image/*,video/*" multiple className="sr-only" disabled={subiendo} onChange={(e) => elegir(e.currentTarget)} />
        </label>
        <ListaArchivos archivos={archivos} estados={estados} />
        {errores.length > 0 && (
          <div role="alert" className="space-y-1 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100">
            {errores.map((m, i) => <p key={i}>{m}</p>)}
          </div>
        )}
        {hayNuevos && <button type="button" className="btn btn-sm" onClick={() => window.location.reload()}>Ver los archivos subidos</button>}
      </form>

      {fotos.length > 0 && (
        <div className="space-y-2">
          {nVideos > 0 && (
            <div className="flex gap-2">
              <button onClick={() => setTipoF('')} className={`pill ${tipoF === '' ? 'pill-active' : ''}`}>Todo · {fotos.length}</button>
              <button onClick={() => setTipoF('foto')} className={`pill ${tipoF === 'foto' ? 'pill-active' : ''}`}><Camera className="h-4 w-4" /> Fotos · {nFotos}</button>
              <button onClick={() => setTipoF('video')} className={`pill ${tipoF === 'video' ? 'pill-active' : ''}`}><Video className="h-4 w-4" /> Videos · {nVideos}</button>
            </div>
          )}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
            <button onClick={() => setFiltro('')} className={`pill ${filtro === '' ? 'pill-active' : ''}`}>Todas las categorías</button>
            {categoriasPresentes.map((c) => (
              <button key={c} onClick={() => setFiltro(c)} className={`pill ${filtro === c ? 'pill-active' : ''}`}>{CATEGORIAS_FOTO[c as keyof typeof CATEGORIAS_FOTO]}</button>
            ))}
          </div>
        </div>
      )}

      {grupos.length === 0 && (
        <div className="card flex flex-col items-center py-12 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><Camera className="h-5 w-5" /></span>
          <p className="mt-3 font-semibold text-slate-800">{fotos.length ? 'No hay archivos con ese filtro' : 'Todavía no hay fotos ni videos'}</p>
          <p className="text-sm text-slate-500">{fotos.length ? 'Cambia el filtro para verlos.' : 'Sube los primeros para empezar el archivo cronológico.'}</p>
        </div>
      )}

      {grupos.map(([fecha, lista]) => (
        <section key={fecha}>
          <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-500" /><h2 className="!text-sm text-slate-500">{fechaLarga(fecha)}</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {lista.map((f) => (
              <button key={f.id} onClick={() => { setAbiertaId(f.id); setEditando(false); }} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 text-left shadow-soft">
                {f.url && (f.tipo_media === 'video'
                  ? <video src={`${f.url}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={f.url} alt={f.descripcion ?? ''} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {f.tipo_media === 'video' && (
                  <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"><Play className="h-5 w-5 translate-x-0.5" /></span></span>
                )}
                {f.es_portada && <span className="badge absolute left-2 top-2 bg-brand-600 text-white"><Star className="h-3 w-3" /> Portada</span>}
                {f.tipo_media === 'video' && <span className="badge absolute right-2 top-2 bg-black/50 text-white backdrop-blur"><Video className="h-3 w-3" /> Video</span>}
                <span className="absolute inset-x-2 bottom-2 truncate text-xs font-semibold text-white">{CATEGORIAS_FOTO[f.categoria as keyof typeof CATEGORIAS_FOTO]}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {abierta && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-3 sm:p-6" onClick={cerrar} role="dialog" aria-modal="true">
          <div className="flex justify-end pb-2"><button className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
          <div className="relative min-h-0 flex-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {abierta.url && (abierta.tipo_media === 'video'
              ? <video key={abierta.id} src={abierta.url} controls autoPlay playsInline className="mx-auto h-full max-w-full object-contain" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={abierta.url} alt="" className="mx-auto h-full max-w-full object-contain" />)}
            {visibles.length > 1 && (
              <>
                <button onClick={() => mover(-1)} aria-label="Anterior" className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur hover:bg-white/25"><ChevronLeft className="h-6 w-6" /></button>
                <button onClick={() => mover(1)} aria-label="Siguiente" className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur hover:bg-white/25"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
          </div>

          <div className="mt-3 text-white" onClick={(e) => e.stopPropagation()}>
            {editando ? (
              <form onSubmit={guardarEdicion} className="grid gap-3 rounded-2xl bg-white/10 p-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/70">Categoría</label>
                  <select name="categoria" defaultValue={abierta.categoria} className="input">{Object.entries(CATEGORIAS_FOTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/70">Fecha</label>
                  <input type="date" name="fecha_toma" defaultValue={abierta.fecha_toma} required className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-white/70">Descripción</label>
                  <input name="descripcion" defaultValue={abierta.descripcion ?? ''} className="input" />
                </div>
                <div className="flex gap-2 sm:col-span-4">
                  <button className="btn btn-sm" disabled={guardando}><Save className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar cambios'}</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-semibold">{CATEGORIAS_FOTO[abierta.categoria as keyof typeof CATEGORIAS_FOTO]} · {formatoFecha(abierta.fecha_toma)}</p>
                  {abierta.descripcion && <p className="text-white/70">{abierta.descripcion}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setEditando(true)}><Pencil className="h-4 w-4" /> Editar</button>
                  {abierta.tipo_media === 'foto' && !abierta.es_portada && <button className="btn-secondary btn-sm" onClick={() => hacerPortada(abierta)}><Star className="h-4 w-4" /> Usar de portada</button>}
                  <button className="btn-danger btn-sm" onClick={() => eliminar(abierta)}><Trash2 className="h-4 w-4" /> Eliminar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fechaLarga(f: string) {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' });
}
