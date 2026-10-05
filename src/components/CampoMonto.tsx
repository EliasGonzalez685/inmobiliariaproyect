'use client';
import { useEffect, useState } from 'react';

// Como un <input type="number">, pero muestra el número con puntos de miles mientras se escribe
// (ej.: "100.000"). El valor real (sin esos puntos, con coma como separador decimal) se guarda en
// un input oculto con el "name" indicado, para que el servidor lo siga recibiendo igual que antes.
function formatear(crudo: string) {
  let s = crudo.replace(/[^\d,]/g, '');
  const i = s.indexOf(',');
  let parteEntera = i === -1 ? s : s.slice(0, i);
  const parteDecimal = i === -1 ? '' : ',' + s.slice(i + 1).replace(/,/g, '').slice(0, 2);
  parteEntera = parteEntera.replace(/^0+(?=\d)/, '');
  const conPuntos = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return conPuntos + parteDecimal;
}

export default function CampoMonto({ name, label, defaultValue, placeholder, required, span, onValor }: {
  name: string;
  label: string;
  defaultValue?: number | string | null;
  placeholder?: string;
  required?: boolean;
  span?: string;
  /** Opcional: avisa el valor numérico actual (o null si está vacío) cada vez que cambia, para cálculos en el formulario que lo usa. */
  onValor?: (v: number | null) => void;
}) {
  const inicial = defaultValue === null || defaultValue === undefined || defaultValue === ''
    ? '' : formatear(String(defaultValue).replace('.', ','));
  const [texto, setTexto] = useState(inicial);

  function alCambiar(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    // Cuenta cuántos dígitos/comas hay antes del cursor, para reubicarlo en el mismo lugar después de reformatear.
    const antesDelCursor = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/[^\d,]/g, '').length;
    const nuevo = formatear(el.value);
    setTexto(nuevo);
    requestAnimationFrame(() => {
      let pos = 0, contados = 0;
      while (pos < nuevo.length && contados < antesDelCursor) { if (/[\d,]/.test(nuevo[pos])) contados++; pos++; }
      el.setSelectionRange(pos, pos);
    });
  }

  const valorReal = texto.replace(/\./g, ''); // lo que recibe el servidor: sin puntos de miles

  useEffect(() => {
    if (!onValor) return;
    const n = Number(valorReal.replace(',', '.'));
    onValor(valorReal.trim() === '' || !Number.isFinite(n) ? null : n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorReal]);

  return (
    <div className={span}>
      <label className="label">{label}</label>
      <input className="input" inputMode="decimal" placeholder={placeholder} required={required}
        value={texto} onChange={alCambiar} />
      <input type="hidden" name={name} value={valorReal} />
    </div>
  );
}
