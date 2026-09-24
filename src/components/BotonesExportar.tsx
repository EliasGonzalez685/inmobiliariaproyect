import { FileSpreadsheet, FileText } from 'lucide-react';

/**
 * Descarga la lista completa (sin filtros) en Excel o PDF para imprimir.
 * Son enlaces normales: el navegador descarga el archivo sin pasar por el router de la app.
 */
export default function BotonesExportar({ recurso }: { recurso: 'propiedades' | 'operaciones' }) {
  const clase = 'btn-secondary btn-sm inline-flex items-center gap-1.5';
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Descargar lista completa para imprimir">
      <a href={`/api/exportar/${recurso}?formato=xlsx`} download className={clase} title="Descargar todo en Excel">
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
      </a>
      <a href={`/api/exportar/${recurso}?formato=pdf`} download className={clase} title="Descargar todo en PDF para imprimir">
        <FileText className="h-4 w-4 text-red-600" /> PDF
      </a>
    </div>
  );
}
