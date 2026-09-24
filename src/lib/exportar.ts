import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ESTADOS_OPERACION, etiquetaEstado, etiquetaOperacion, etiquetaTipo } from '@/lib/constants';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Fila = Record<string, any>;

const COLOR_MARCA = '4F46E5';
const hoyPY = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' });
const fechaCorta = (f?: string | null) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '');
const fechaLarga = () => new Date().toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Asuncion' });
const miles = (n: number, dec = 0) => n.toLocaleString('es-PY', { maximumFractionDigits: dec, minimumFractionDigits: dec });
const dinero = (n: number | null | undefined, moneda: string) =>
  n === null || n === undefined ? '' : `${moneda === 'USD' ? 'US$' : 'Gs.'} ${miles(Number(n), moneda === 'USD' ? 2 : 0)}`;
const m2 = (n: number | null | undefined) => (n === null || n === undefined ? '' : `${Number(n).toLocaleString('es-PY', { maximumFractionDigits: 2 })} m²`);

export const nombreArchivo = (base: string, ext: string) => `${base}-${hoyPY()}.${ext}`;

// ───────────────────────── Datos ─────────────────────────

export async function cargarPropiedades(supabase: SupabaseClient): Promise<Fila[]> {
  const { data, error } = await supabase.from('propiedades').select('*, clientes(nombre)').order('titulo');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cargarOperaciones(supabase: SupabaseClient): Promise<Fila[]> {
  const { data, error } = await supabase.from('operaciones')
    .select('*, propiedades(titulo), clientes(nombre)').order('fecha', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const propiedadDe = (o: Fila): string => o.propiedades?.titulo ?? o.propiedad_titulo ?? '';
const clienteDe = (o: Fila): string => o.clientes?.nombre ?? o.cliente_nombre ?? '';

/** Totales de operaciones concretadas por moneda. */
function totalesOperaciones(filas: Fila[]) {
  const t: Record<string, { cantidad: number; monto: number; comision: number }> = {};
  for (const o of filas) {
    if (o.estado !== 'concretada') continue;
    const x = (t[o.moneda] ??= { cantidad: 0, monto: 0, comision: 0 });
    x.cantidad += 1;
    x.monto += Number(o.monto ?? 0);
    x.comision += Number(o.comision ?? 0);
  }
  return t;
}

// ───────────────────────── Excel ─────────────────────────

function hoja(wb: ExcelJS.Workbook, nombre: string, titulo: string, columnas: { h: string; w: number; f?: string; al?: 'left' | 'right' | 'center' }[], filas: any[][]) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 3 }] });
  ws.mergeCells(1, 1, 1, columnas.length);
  const t = ws.getCell(1, 1);
  t.value = `${titulo} · ${fechaLarga()}`;
  t.font = { bold: true, size: 14, color: { argb: 'FF1E1B4B' } };
  t.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 26;

  const cab = ws.getRow(3);
  columnas.forEach((c, i) => {
    const cell = cab.getCell(i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_MARCA}` } };
    cell.alignment = { vertical: 'middle', horizontal: c.al ?? 'left', wrapText: true };
    ws.getColumn(i + 1).width = c.w;
  });
  cab.height = 24;

  filas.forEach((fila, r) => {
    const row = ws.getRow(4 + r);
    fila.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      if (columnas[i].f) cell.numFmt = columnas[i].f!;
      cell.alignment = { vertical: 'top', horizontal: columnas[i].al ?? 'left', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });
  });

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columnas.length } };
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '3:3', margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
  ws.headerFooter = { oddFooter: '&LINMOBILIARIAPROYECT&RPágina &P de &N' };
  return { ws, ultima: 3 + filas.length };
}

export async function excelPropiedades(filas: Fila[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'INMOBILIARIAPROYECT';
  const { ws, ultima } = hoja(wb, 'Propiedades', 'Listado de propiedades', [
    { h: 'Código', w: 12 }, { h: 'Propiedad', w: 34 }, { h: 'Tipo', w: 16 }, { h: 'Estado', w: 16 },
    { h: 'Dirección', w: 28 }, { h: 'Barrio', w: 18 }, { h: 'Ciudad', w: 18 }, { h: 'Departamento', w: 16 },
    { h: 'Terreno (m²)', w: 14, f: '#,##0.##', al: 'right' }, { h: 'Construido (m²)', w: 15, f: '#,##0.##', al: 'right' },
    { h: 'Dormitorios', w: 12, al: 'center' }, { h: 'Baños', w: 9, al: 'center' }, { h: 'Cocheras', w: 10, al: 'center' }, { h: 'Año', w: 8, al: 'center' },
    { h: 'Moneda', w: 9, al: 'center' }, { h: 'Precio / valor', w: 18, f: '#,##0.##', al: 'right' },
    { h: 'Propietario / cliente', w: 24 }, { h: 'Finca N°', w: 12 }, { h: 'Padrón N°', w: 12 }, { h: 'Lote N°', w: 10 }, { h: 'Manzana N°', w: 11 },
    { h: 'Cta. Cte. Catastral', w: 18 }, { h: 'Notas', w: 36 },
  ], filas.map((p) => [
    p.codigo ?? '', p.titulo ?? '', etiquetaTipo(p), etiquetaEstado(p),
    p.direccion ?? '', p.barrio ?? '', p.ciudad ?? '', p.departamento ?? '',
    p.superficie_terreno === null ? null : Number(p.superficie_terreno), p.superficie_construida === null ? null : Number(p.superficie_construida),
    p.dormitorios, p.banos, p.cocheras, p.anio_construccion,
    p.precio === null ? '' : (p.moneda === 'USD' ? 'US$' : 'Gs.'), p.precio === null ? null : Number(p.precio),
    p.clientes?.nombre ?? '', p.finca_nro ?? '', p.padron_nro ?? '', p.lote_nro ?? '', p.manzana_nro ?? '',
    p.cuenta_corriente_catastral ?? '', p.notas ?? '',
  ]));
  const r = ws.getRow(ultima + 2);
  r.getCell(1).value = `Total: ${filas.length} ${filas.length === 1 ? 'propiedad' : 'propiedades'}`;
  r.getCell(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function hojaOperaciones(wb: ExcelJS.Workbook, filas: Fila[]) {
  const { ws, ultima } = hoja(wb, 'Operaciones', 'Listado de operaciones', [
    { h: 'Fecha', w: 12, f: 'dd/mm/yyyy', al: 'center' }, { h: 'Tipo', w: 13 }, { h: 'Estado', w: 13 },
    { h: 'Propiedad', w: 34 }, { h: 'Cliente', w: 24 },
    { h: 'Moneda', w: 9, al: 'center' }, { h: 'Monto', w: 18, f: '#,##0.##', al: 'right' }, { h: 'Comisión', w: 16, f: '#,##0.##', al: 'right' },
    { h: 'Forma de pago', w: 20 }, { h: 'Inicio contrato', w: 14, f: 'dd/mm/yyyy', al: 'center' }, { h: 'Fin contrato', w: 14, f: 'dd/mm/yyyy', al: 'center' }, { h: 'Notas', w: 36 },
  ], filas.map((o) => [
    o.fecha ? new Date(`${o.fecha}T12:00:00`) : null, etiquetaOperacion(o), ESTADOS_OPERACION[o.estado as keyof typeof ESTADOS_OPERACION] ?? o.estado,
    propiedadDe(o), clienteDe(o),
    o.moneda === 'USD' ? 'US$' : 'Gs.', o.monto === null ? null : Number(o.monto), o.comision === null ? null : Number(o.comision),
    o.forma_pago ?? '', o.fecha_inicio ? new Date(`${o.fecha_inicio}T12:00:00`) : null, o.fecha_fin ? new Date(`${o.fecha_fin}T12:00:00`) : null, o.notas ?? '',
  ]));

  // Resumen de operaciones concretadas por moneda
  const t = totalesOperaciones(filas);
  let fila = ultima + 2;
  ws.getRow(fila).getCell(1).value = 'Resumen de operaciones concretadas';
  ws.getRow(fila).getCell(1).font = { bold: true, color: { argb: 'FF1E1B4B' } };
  fila += 1;
  for (const [moneda, x] of Object.entries(t)) {
    const r = ws.getRow(fila++);
    const sim = moneda === 'USD' ? 'US$' : 'Gs.';
    r.getCell(1).value = `${sim}: ${x.cantidad} ${x.cantidad === 1 ? 'operación' : 'operaciones'}`;
    r.getCell(6).value = sim;
    r.getCell(6).alignment = { horizontal: 'center' };
    r.getCell(7).value = { formula: `SUMIFS(G4:G${ultima},F4:F${ultima},"${sim}",C4:C${ultima},"Concretada")`, result: x.monto };
    r.getCell(8).value = { formula: `SUMIFS(H4:H${ultima},F4:F${ultima},"${sim}",C4:C${ultima},"Concretada")`, result: x.comision };
    r.getCell(7).numFmt = '#,##0.##'; r.getCell(8).numFmt = '#,##0.##';
    r.font = { bold: true };
  }
  if (Object.keys(t).length === 0) ws.getRow(fila).getCell(1).value = 'Todavía no hay operaciones concretadas.';
}

export async function excelOperaciones(filas: Fila[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'INMOBILIARIAPROYECT';
  hojaOperaciones(wb, filas);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ───────────────────────── PDF ─────────────────────────

function nuevoPdf() {
  return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
}

function titulo(doc: jsPDF, texto: string, detalle: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 27, 75);
  doc.text(texto, 12, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(detalle, 12, 22);
}

const estiloTabla = {
  theme: 'grid' as const,
  styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1, textColor: [30, 41, 59] as [number, number, number], overflow: 'linebreak' as const },
  headStyles: { fillColor: [79, 70, 229] as [number, number, number], textColor: 255, fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  margin: { left: 12, right: 12, top: 16, bottom: 14 },
};

function pieDePagina(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('INMOBILIARIAPROYECT', 12, h - 7);
    doc.text(`Página ${i} de ${total}`, w - 12, h - 7, { align: 'right' });
  }
}

const vacio = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : String(v));

export function pdfPropiedades(filas: Fila[]): Buffer {
  const doc = nuevoPdf();
  titulo(doc, 'Listado de propiedades', `${fechaLarga()} · ${filas.length} ${filas.length === 1 ? 'propiedad' : 'propiedades'}`);
  autoTable(doc, {
    ...estiloTabla,
    startY: 27,
    head: [['Código', 'Propiedad', 'Tipo', 'Estado', 'Ubicación', 'Terreno', 'Const.', 'Dorm.', 'Baños', 'Precio / valor', 'Propietario / cliente']],
    body: filas.map((p) => [
      vacio(p.codigo), vacio(p.titulo), vacio(etiquetaTipo(p)), vacio(etiquetaEstado(p)),
      vacio([p.direccion, p.barrio, p.ciudad].filter(Boolean).join(', ')),
      vacio(m2(p.superficie_terreno)), vacio(m2(p.superficie_construida)), vacio(p.dormitorios), vacio(p.banos),
      vacio(p.precio === null ? '' : dinero(p.precio, p.moneda)), vacio(p.clientes?.nombre),
    ]),
    columnStyles: { 0: { cellWidth: 16 }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'center', cellWidth: 12 }, 8: { halign: 'center', cellWidth: 12 }, 9: { halign: 'right' } },
  });
  pieDePagina(doc);
  return Buffer.from(doc.output('arraybuffer'));
}

export function pdfOperaciones(filas: Fila[]): Buffer {
  const doc = nuevoPdf();
  titulo(doc, 'Listado de operaciones', `${fechaLarga()} · ${filas.length} ${filas.length === 1 ? 'operación' : 'operaciones'}`);
  autoTable(doc, {
    ...estiloTabla,
    startY: 27,
    head: [['Fecha', 'Tipo', 'Estado', 'Propiedad', 'Cliente', 'Monto', 'Comisión', 'Forma de pago', 'Contrato']],
    body: filas.map((o) => [
      fechaCorta(o.fecha), etiquetaOperacion(o), ESTADOS_OPERACION[o.estado as keyof typeof ESTADOS_OPERACION] ?? o.estado,
      vacio(propiedadDe(o)), vacio(clienteDe(o)),
      vacio(o.monto === null ? '' : dinero(o.monto, o.moneda)), vacio(o.comision === null ? '' : dinero(o.comision, o.moneda)), vacio(o.forma_pago),
      o.tipo === 'alquiler' && o.fecha_inicio ? `${fechaCorta(o.fecha_inicio)}${o.fecha_fin ? ` a ${fechaCorta(o.fecha_fin)}` : ''}` : '-',
    ]),
    columnStyles: { 0: { cellWidth: 20 }, 5: { halign: 'right' }, 6: { halign: 'right' } },
  });

  const t = totalesOperaciones(filas);
  const resumen = Object.entries(t).map(([m, x]) => [
    m === 'USD' ? 'US$' : 'Gs.', String(x.cantidad), dinero(x.monto, m), dinero(x.comision, m),
  ]);
  if (resumen.length) {
    const y = ((doc as any).lastAutoTable?.finalY ?? 27) + 8;
    autoTable(doc, {
      ...estiloTabla,
      startY: y,
      head: [['Resumen (concretadas)', 'Operaciones', 'Monto total', 'Comisiones']],
      body: resumen,
      tableWidth: 150,
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
  }
  pieDePagina(doc);
  return Buffer.from(doc.output('arraybuffer'));
}
