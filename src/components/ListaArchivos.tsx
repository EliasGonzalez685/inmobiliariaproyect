'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Camera, CircleAlert, CircleCheck, Clock, Loader2, Video, X } from 'lucide-react';
import { esVideo, type EstadoArchivo } from '@/lib/media';

const mbTexto = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('es-PY', { maximumFractionDigits: 1 })} MB`;

/**
 * Vista de los archivos elegidos: miniatura, nombre, tamaño y estado de cada uno
 * (en espera, subiendo con porcentaje real, listo o con error), para que siempre se vea qué está pasando.
 */
export default function ListaArchivos({ archivos, estados, textoEspera, alQuitar }: {
  archivos: File[];
  estados: EstadoArchivo[];
  textoEspera?: string;
  alQuitar?: (indice: number) => void;
}) {
  const urls = useMemo(() => archivos.map((f) => URL.createObjectURL(f)), [archivos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const raiz = useRef<HTMLDivElement>(null);
  const enCurso = estados.some((e) => e?.estado === 'subiendo');
  // Al empezar a subir se lleva la vista hasta el avance, para que siempre se vea qué está pasando.
  useEffect(() => { if (enCurso) raiz.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [enCurso]);

  if (!archivos.length) return null;
  const listos = estados.filter((e) => e?.estado === 'listo').length;
  const total = archivos.length;
  const global = Math.round(estados.reduce((a, e) => a + (e?.estado === 'listo' || e?.estado === 'error' ? 100 : e?.progreso ?? 0), 0) / total);

  return (
    <div ref={raiz} className="space-y-3" aria-live="polite">
      {(enCurso || listos > 0) && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{enCurso ? `Subiendo… ${listos} de ${total} listos` : `${listos} de ${total} subidos`}</span>
            <span>{global}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${global}%` }} /></div>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {archivos.map((f, i) => {
          const e = estados[i] ?? { estado: 'esperando' as const, progreso: 0 };
          const video = esVideo(f);
          return (
            <li key={`${f.name}-${i}`} className="relative overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              <div className="relative aspect-[4/3]">
                <span className="absolute inset-0 flex items-center justify-center text-slate-300">{video ? <Video className="h-8 w-8" /> : <Camera className="h-8 w-8" />}</span>
                {video
                  ? <video src={`${urls[i]}#t=0.5`} preload="metadata" muted playsInline className="relative h-full w-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={urls[i]} alt="" className="relative h-full w-full object-cover" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />}
                <div className={`absolute inset-0 z-10 ${e.estado === 'subiendo' ? 'bg-black/40' : e.estado === 'error' ? 'bg-red-900/50' : ''}`} />
                {e.estado === 'subiendo' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm font-bold">{e.progreso}%</span>
                  </div>
                )}
                {e.estado === 'listo' && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow"><CircleCheck className="h-4 w-4" /></span>}
                {e.estado === 'error' && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow"><CircleAlert className="h-4 w-4" /></span>}
                {e.estado === 'esperando' && alQuitar && (
                  <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => alQuitar(i)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"><X className="h-4 w-4" /></button>
                )}
                {video && <span className="badge absolute left-2 top-2 bg-black/50 text-white"><Video className="h-3 w-3" /> Video</span>}
                {e.estado === 'subiendo' && <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/30"><div className="h-full bg-brand-400 transition-all duration-200" style={{ width: `${e.progreso}%` }} /></div>}
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-xs font-semibold text-slate-700">{f.name}</p>
                <p className={`flex items-center gap-1 text-[11px] ${e.estado === 'error' ? 'font-medium text-red-600' : e.estado === 'listo' ? 'font-medium text-emerald-600' : 'text-slate-400'}`}>
                  {e.estado === 'esperando' && <><Clock className="h-3 w-3" /> {textoEspera ?? 'En espera'} · {mbTexto(f.size)}</>}
                  {e.estado === 'subiendo' && <>Subiendo · {mbTexto(f.size)}</>}
                  {e.estado === 'listo' && <>Subido correctamente</>}
                  {e.estado === 'error' && <>{e.mensaje ?? 'No se pudo subir'}</>}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
