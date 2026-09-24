// Gráfico de anillo simple (SVG) para la distribución por estado.
export default function Donut({ datos, total, etiqueta }: { datos: { nombre: string; valor: number; color: string }[]; total: number; etiqueta: string }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={etiqueta}>
          <circle r={R} cx="70" cy="70" fill="none" stroke="#f1f5f9" strokeWidth="18" />
          {total > 0 && datos.map((d) => {
            const largo = (d.valor / total) * C;
            const el = (
              <circle key={d.nombre} r={R} cx="70" cy="70" fill="none" stroke={d.color} strokeWidth="18" strokeLinecap="round"
                strokeDasharray={`${Math.max(largo - 3, 0)} ${C - Math.max(largo - 3, 0)}`} strokeDashoffset={-acumulado} />
            );
            acumulado += largo;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-slate-900">{total}</p>
          <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
        </div>
      </div>
      <ul className="w-full space-y-2.5 text-sm">
        {datos.length === 0 && <li className="text-slate-500">Aún no hay propiedades registradas.</li>}
        {datos.map((d) => (
          <li key={d.nombre} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.nombre}</span>
            <span className="font-semibold text-slate-900">{d.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
