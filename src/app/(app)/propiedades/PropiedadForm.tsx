'use client';
import { useRef, useState } from 'react';
import Link from '@/components/LinkSeguro';
import { AlertCircle, Banknote, Camera, FileBadge, FileText, Landmark, MapPin, Ruler, Save, Upload, X } from 'lucide-react';
import { CATEGORIAS_FOTO, ESTADOS_PROPIEDAD, MONEDAS, OPERACIONES, SERVICIOS, TIPOS_DOCUMENTO, TIPOS_PROPIEDAD } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { MAX_VIDEO_MB, subirMedia, type EstadoArchivo } from '@/lib/media';
import { MAX_DOCUMENTO_MB, subirDocumentos } from '@/lib/documentos';
import ListaArchivos from '@/components/ListaArchivos';
import CampoMonto from '@/components/CampoMonto';
import { llamar } from '@/lib/llamar';

type P = Record<string, any>;

function Seccion({ icon: Icon, titulo, tono, children }: { icon: typeof Ruler; titulo: string; tono: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="mb-5 flex items-center gap-3"><span className={`icon-chip !h-9 !w-9 ${tono}`}><Icon className="h-[18px] w-[18px]" /></span><h2>{titulo}</h2></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

// Lista simple de los documentos elegidos (sin miniatura, a diferencia de las fotos): nombre, tamaño y estado de cada uno.
function ListaDocumentosElegidos({ archivos, estados, alQuitar }: { archivos: File[]; estados: EstadoArchivo[]; alQuitar?: (i: number) => void }) {
  if (!archivos.length) return null;
  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString('es-PY', { maximumFractionDigits: 1 })} MB`;
  return (
    <ul className="space-y-2">
      {archivos.map((f, i) => {
        const e = estados[i] ?? { estado: 'esperando' as const, progreso: 0 };
        return (
          <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
            <span className="icon-chip !h-9 !w-9 shrink-0 bg-white text-slate-500 shadow-soft"><FileText className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700">{f.name}</p>
              <p className={`text-xs ${e.estado === 'error' ? 'font-medium text-red-600' : e.estado === 'listo' ? 'font-medium text-emerald-600' : 'text-slate-400'}`}>
                {e.estado === 'esperando' && `Se sube al crear la propiedad · ${mb(f.size)}`}
                {e.estado === 'subiendo' && 'Subiendo…'}
                {e.estado === 'listo' && 'Subido correctamente'}
                {e.estado === 'error' && (e.mensaje ?? 'No se pudo subir')}
              </p>
            </div>
            {e.estado === 'esperando' && alQuitar && (
              <button type="button" onClick={() => alQuitar(i)} aria-label={`Quitar ${f.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"><X className="h-4 w-4" /></button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PropiedadForm({ propiedad, clientes }: { propiedad?: P; clientes: { id: string; nombre: string }[] }) {
  const p: P = propiedad ?? {};
  const inputArchivos = useRef<HTMLInputElement>(null);
  const inputDocs = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<string>(p.tipo ?? 'casa');
  const [estado, setEstado] = useState<string>(p.estado ?? 'disponible');
  // Superficie del terreno: se puede cargar en m² y/o en hectáreas (1 ha = 10.000 m²); se guarda en m².
  const [m2, setM2] = useState<string>(p.superficie_terreno != null ? String(Number(p.superficie_terreno)) : '');
  const [ha, setHa] = useState<string>(p.superficie_terreno != null ? String(Number(p.superficie_terreno) / 10000) : '');
  const cambiarM2 = (v: string) => {
    setM2(v);
    const n = Number(v.replace(',', '.'));
    setHa(v.trim() === '' || !Number.isFinite(n) ? '' : String(Number((n / 10000).toFixed(4))));
  };
  const cambiarHa = (v: string) => {
    setHa(v);
    const n = Number(v.replace(',', '.'));
    setM2(v.trim() === '' || !Number.isFinite(n) ? '' : String(Number((n * 10000).toFixed(2))));
  };
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estados, setEstados] = useState<EstadoArchivo[]>([]);
  const [archivosDoc, setArchivosDoc] = useState<File[]>([]);
  const [estadosDoc, setEstadosDoc] = useState<EstadoArchivo[]>([]);
  const [pendiente, setPendiente] = useState<{ id: string; errores: string[]; destino: string } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setEnviando(true);
    // Petición normal con tiempo máximo: si el servidor no responde, se avisa y se puede reintentar (los datos siguen en el formulario).
    const res = await llamar<{ id?: string; operacionId?: string }>('guardarPropiedad', [p.id ?? null], fd);
    if (res.ir) { window.location.assign(res.ir); return; }
    if (res.error || !res.id) { setError(res.error ?? 'No se pudo guardar la propiedad.'); setEnviando(false); return; }

    if (!p.id && (archivos.length || archivosDoc.length)) {
      const supabase = createClient();
      const erroresTotales: string[] = [];

      if (archivos.length) {
        setEstados(archivos.map(() => ({ estado: 'esperando' as const, progreso: 0 })));
        const { errores } = await subirMedia(
          supabase, res.id, archivos,
          { categoria: String(fd.get('media_categoria') ?? 'estado_general'), fecha_toma: String(fd.get('media_fecha')) },
          {
            yaTienePortada: false,
            alAvanzar: (h, t) => setProgreso(h < t ? `Subiendo foto/video ${h + 1} de ${t}…` : ''),
            alArchivo: (i, e) => setEstados((prev) => prev.map((x, j) => (j === i ? e : x))),
          },
        );
        erroresTotales.push(...errores);
      }

      if (archivosDoc.length) {
        setEstadosDoc(archivosDoc.map(() => ({ estado: 'esperando' as const, progreso: 0 })));
        const { errores } = await subirDocumentos(
          supabase, res.id, archivosDoc, String(fd.get('doc_tipo') ?? 'otro'),
          {
            alAvanzar: (h, t) => setProgreso(h < t ? `Subiendo documento ${h + 1} de ${t}…` : ''),
            alArchivo: (i, e) => setEstadosDoc((prev) => prev.map((x, j) => (j === i ? e : x))),
          },
        );
        erroresTotales.push(...errores);
      }

      const destino = archivos.length ? 'fotos' : 'documentos';
      if (erroresTotales.length) { setPendiente({ id: res.id, errores: erroresTotales, destino }); setEnviando(false); return; }
      setTimeout(() => window.location.assign(`/propiedades/${res.id}?tab=${destino}`), 700); // se alcanza a ver todo "listo"
      return;
    }
    window.location.assign(res.operacionId ? `/propiedades/${res.id}?nueva=${res.operacionId}` : `/propiedades/${res.id}`);
  }

  function agregarArchivos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    // Se copia la lista ANTES de vaciar el input: la FileList es "viva" y se vacía al limpiar el valor.
    const nuevos = Array.from(lista);
    if (inputArchivos.current) inputArchivos.current.value = '';
    setArchivos((prev) => [...prev, ...nuevos]);
  }

  function agregarArchivosDoc(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const nuevos = Array.from(lista);
    if (inputDocs.current) inputDocs.current.value = '';
    setArchivosDoc((prev) => [...prev, ...nuevos]);
  }

  const campo = (name: string, label: string, opts: { type?: string; step?: string; placeholder?: string; span?: string; inputMode?: 'decimal' | 'numeric' | 'text'; required?: boolean } = {}) => (
    <div className={opts.span}>
      <label className="label">{label}</label>
      <input className="input" name={name} type={opts.type ?? 'text'} step={opts.type === 'number' ? 'any' : undefined} placeholder={opts.placeholder} inputMode={opts.inputMode}
        required={opts.required} defaultValue={p[name] ?? ''} />
    </div>
  );
  const select = (name: string, label: string, opciones: Record<string, string>) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" name={name} defaultValue={p[name] ?? Object.keys(opciones)[0]}>
        {Object.entries(opciones).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  // Lista con opción "Otro": al elegirla aparece una casilla para escribirlo textualmente.
  const conOtro = (
    name: string, label: string, opciones: Record<string, string>, valor: string, cambiar: (v: string) => void,
    nombreOtro: string, etiquetaOtro: string, ejemplo: string,
  ) => (
    <>
      <div>
        <label className="label">{label}</label>
        <select className="input" name={name} value={valor} onChange={(e) => cambiar(e.target.value)}>
          {Object.entries(opciones).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {valor === 'otro' && (
        <div>
          <label className="label">{etiquetaOtro}</label>
          <input className="input" name={nombreOtro} maxLength={60} placeholder={ejemplo} defaultValue={p[nombreOtro] ?? ''} />
        </div>
      )}
    </>
  );
  const area = (name: string, label: string) => (
    <div className="sm:col-span-2 lg:col-span-3">
      <label className="label">{label}</label>
      <textarea className="input" rows={3} name={name} defaultValue={p[name] ?? ''} />
    </div>
  );

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Seccion icon={FileText} titulo="Datos generales" tono="bg-brand-50 text-brand-600">
        {campo('titulo', 'Título', { span: 'sm:col-span-2', placeholder: 'Ej.: Casa Barrio Jara, Asunción (si lo dejas vacío se arma solo)' })}
        {campo('codigo', 'Código interno', { placeholder: 'Ej.: PROP-001' })}
        {conOtro('tipo', 'Tipo', TIPOS_PROPIEDAD, tipo, setTipo, 'tipo_otro', 'Escribe el tipo de propiedad', 'Ej.: Galpón, Chacra…')}
        {conOtro('estado', 'Estado', ESTADOS_PROPIEDAD, estado, setEstado, 'estado_otro', 'Escribe el estado', 'Ej.: En litigio, En venta…')}
        {select('operacion', 'Operación', OPERACIONES)}
        <div>
          <label className="label">Propietario / cliente</label>
          <select className="input" name="cliente_id" defaultValue={p.cliente_id ?? ''}>
            <option value="">— Sin asignar —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </Seccion>

      <Seccion icon={MapPin} titulo="Ubicación" tono="bg-rose-50 text-rose-600">
        {campo('direccion', 'Dirección', { span: 'sm:col-span-2 lg:col-span-3' })}
        {campo('barrio', 'Barrio')}
        {campo('ciudad', 'Ciudad')}
        {campo('departamento', 'Departamento')}
        {campo('latitud', 'Latitud', { type: 'number', step: 'any', inputMode: 'decimal' })}
        {campo('longitud', 'Longitud', { type: 'number', step: 'any', inputMode: 'decimal' })}
      </Seccion>

      <Seccion icon={Ruler} titulo="Datos técnicos" tono="bg-sky-50 text-sky-600">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="terreno-m2">Superficie del terreno</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input id="terreno-m2" className="input !pr-11" name="superficie_terreno" type="number" step="any" min="0" inputMode="decimal"
                placeholder="0" value={m2} onChange={(e) => cambiarM2(e.target.value)} />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-semibold text-slate-400">m²</span>
            </div>
            <div className="relative">
              <input id="terreno-ha" className="input !pr-11" type="number" step="any" min="0" inputMode="decimal" aria-label="Superficie del terreno en hectáreas"
                placeholder="0" value={ha} onChange={(e) => cambiarHa(e.target.value)} />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-semibold text-slate-400">ha</span>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Carga en m², en hectáreas o en ambos: se convierten solos (1 ha = 10.000 m²).</p>
        </div>
        {campo('superficie_construida', 'Superficie construida (m²)', { type: 'number', step: '0.01', inputMode: 'decimal' })}
        {campo('medidas', 'Medidas (frente x fondo)')}
        {campo('dormitorios', 'Dormitorios', { type: 'number', inputMode: 'numeric' })}
        {campo('banos', 'Baños', { type: 'number', inputMode: 'numeric' })}
        {campo('cocheras', 'Cocheras', { type: 'number', inputMode: 'numeric' })}
        {campo('anio_construccion', 'Año de construcción', { type: 'number', inputMode: 'numeric' })}
        {area('linderos', 'Linderos')}
        {area('mejoras', 'Mejoras realizadas')}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="label">Servicios</label>
          <div className="flex flex-wrap gap-2">
            {SERVICIOS.map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="checkbox" name="servicios" value={s} defaultChecked={(p.servicios ?? []).includes(s)} className="peer sr-only" />
                <span className="pill peer-checked:!border-brand-600 peer-checked:!bg-brand-50 peer-checked:!text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400">{s}</span>
              </label>
            ))}
          </div>
        </div>
      </Seccion>

      <Seccion icon={Landmark} titulo="Datos legales" tono="bg-emerald-50 text-emerald-600">
        {campo('finca_nro', 'Finca N°')}
        {campo('padron_nro', 'Padrón N°')}
        {campo('lote_nro', 'Lote N°')}
        {campo('manzana_nro', 'Manzana N°')}
        {campo('cuenta_corriente_catastral', 'Cta. Cte. Catastral')}
        {area('informacion_adicional', 'Información adicional')}
      </Seccion>

      <Seccion icon={Banknote} titulo="Valor y notas" tono="bg-amber-50 text-amber-600">
        {select('moneda', 'Moneda', MONEDAS)}
        <CampoMonto name="precio" label="Precio / valor" defaultValue={p.precio} placeholder="0" />
        <div className="hidden lg:block" />
        {area('notas', 'Notas internas')}
      </Seccion>

      {!p.id && (
        <section className="card">
          <div className="mb-1 flex items-center gap-3"><span className="icon-chip !h-9 !w-9 bg-pink-50 text-pink-600"><Camera className="h-[18px] w-[18px]" /></span><h2>Fotos y videos (opcional)</h2></div>
          <p className="mb-4 text-sm text-slate-500">Puedes subirlos ahora o más tarde desde la propiedad. Videos de hasta {MAX_VIDEO_MB} MB.</p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-7 text-center transition hover:border-brand-400 hover:bg-brand-50">
            <span className="icon-chip bg-white text-brand-600 shadow-soft"><Upload className="h-5 w-5" /></span>
            <span className="font-semibold text-slate-800">{archivos.length ? 'Agregar más fotos o videos' : 'Toca para elegir fotos o videos'}</span>
            <input ref={inputArchivos} type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => agregarArchivos(e.target.files)} />
          </label>
          {archivos.length > 0 && (
            <>
              <div className="mt-4">
                <ListaArchivos archivos={archivos} estados={estados} textoEspera="Se sube al crear la propiedad" alQuitar={enviando ? undefined : (i) => setArchivos(archivos.filter((_, j) => j !== i))} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" name="media_categoria">{Object.entries(CATEGORIAS_FOTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </div>
                <div><label className="label">Fecha</label><input className="input" type="date" name="media_fecha" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
              </div>
            </>
          )}
        </section>
      )}

      {!p.id && (
        <section className="card">
          <div className="mb-1 flex items-center gap-3"><span className="icon-chip !h-9 !w-9 bg-sky-50 text-sky-600"><FileBadge className="h-[18px] w-[18px]" /></span><h2>Documentos (opcional)</h2></div>
          <p className="mb-4 text-sm text-slate-500">Escrituras, planos, contratos… Puedes subirlos ahora o más tarde desde la propiedad. Hasta {MAX_DOCUMENTO_MB} MB cada uno.</p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-7 text-center transition hover:border-brand-400 hover:bg-brand-50">
            <span className="icon-chip bg-white text-brand-600 shadow-soft"><Upload className="h-5 w-5" /></span>
            <span className="font-semibold text-slate-800">{archivosDoc.length ? 'Agregar más documentos' : 'Toca para elegir documentos'}</span>
            <span className="text-xs text-slate-500">PDF, imágenes, Word…</span>
            <input ref={inputDocs} type="file" multiple className="sr-only" onChange={(e) => agregarArchivosDoc(e.target.files)} />
          </label>
          {archivosDoc.length > 0 && (
            <>
              <div className="mt-4">
                <ListaDocumentosElegidos archivos={archivosDoc} estados={estadosDoc} alQuitar={enviando ? undefined : (i) => setArchivosDoc(archivosDoc.filter((_, j) => j !== i))} />
              </div>
              <div className="mt-4">
                <label className="label">Tipo de documento (se aplica a todos los que elegiste)</label>
                <select className="input" name="doc_tipo" defaultValue="otro">{Object.entries(TIPOS_DOCUMENTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
            </>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>
      )}

      {pendiente && (
        <div role="alert" className="space-y-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          <p className="font-semibold">La propiedad se creó, pero algunos archivos no se subieron:</p>
          {pendiente.errores.map((m, i) => <p key={i}>{m}</p>)}
          <Link href={`/propiedades/${pendiente.id}?tab=${pendiente.destino}`} className="btn btn-sm mt-1">Ir a la propiedad y volver a subirlos</Link>
        </div>
      )}

      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-lift backdrop-blur-xl lg:bottom-4">
        <button className="btn flex-1 sm:flex-none" disabled={enviando || !!pendiente}>
          <Save className="h-4 w-4" /> {enviando ? (progreso || 'Guardando…') : p.id ? 'Guardar cambios' : 'Crear propiedad'}
        </button>
        <Link href={p.id ? `/propiedades/${p.id}` : '/propiedades'} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
