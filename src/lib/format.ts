export function formatoMonto(monto: number | string | null | undefined, moneda: string = 'PYG') {
  if (monto === null || monto === undefined || monto === '') return '—';
  const n = Number(monto);
  const simbolo = moneda === 'USD' ? 'US$' : 'Gs.';
  return `${simbolo} ${n.toLocaleString('es-PY', { maximumFractionDigits: moneda === 'USD' ? 2 : 0 })}`;
}

export function formatoFecha(fecha: string | null | undefined) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function diasHasta(fecha: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - hoy.getTime()) / 86400000);
}

export function num(v: FormDataEntryValue | null) {
  if (v === null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function entero(v: FormDataEntryValue | null) {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
}

export function txt(v: FormDataEntryValue | null) {
  const s = v === null ? '' : String(v).trim();
  return s === '' ? null : s;
}

// Aspecto de un vencimiento según los días que faltan
export function tonoVencimiento(dias: number) {
  if (dias < 0) return { clase: 'bg-red-50 text-red-700 ring-1 ring-red-200', hex: '#ef4444' };
  if (dias <= 30) return { clase: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', hex: '#f59e0b' };
  return { clase: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', hex: '#94a3b8' };
}

export function textoVencimiento(dias: number) {
  if (dias < 0) return `Vencido hace ${-dias} d`;
  if (dias === 0) return 'Vence hoy';
  return `En ${dias} días`;
}

export function saludoFecha() {
  return new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Asuncion' });
}

const M2_POR_HA = 10000;

/** Superficie guardada en m²: se muestra en m² y, si llega a 1 ha o más, también en hectáreas. */
export function formatoSuperficie(m2: number | string | null | undefined) {
  if (m2 === null || m2 === undefined || m2 === '') return null;
  const n = Number(m2);
  if (!Number.isFinite(n)) return null;
  const base = `${n.toLocaleString('es-PY', { maximumFractionDigits: 2 })} m²`;
  return n >= M2_POR_HA ? `${base} · ${(n / M2_POR_HA).toLocaleString('es-PY', { maximumFractionDigits: 4 })} ha` : base;
}

/** Monto abreviado para tarjetas: "Gs. 2.690 mill." (el valor exacto va en el detalle). */
export function formatoMontoCompacto(monto: number, moneda: string = 'PYG') {
  const umbral = moneda === 'USD' ? 1e6 : 1e9;
  if (Math.abs(monto) < umbral) return formatoMonto(monto, moneda);
  const simbolo = moneda === 'USD' ? 'US$' : 'Gs.';
  return `${simbolo} ${(monto / 1e6).toLocaleString('es-PY', { maximumFractionDigits: moneda === 'USD' ? 2 : 0 })} mill.`;
}
