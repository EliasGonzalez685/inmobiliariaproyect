// Cruce entre un pedido de un cliente y las propiedades disponibles.
// Único requisito para considerar una propiedad: que sea del mismo tipo que lo que pide el
// cliente (pide una casa y hay casas en stock → ya cuenta, sin importar precio ni zona).
// El precio (con la misma moneda) y la zona NO descartan a nadie: solo le dan más prioridad
// a las que estén más cerca del presupuesto buscado o en la misma zona, para que esas
// aparezcan primero en la lista.
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type PedidoParaCoincidencia = { tipo: string; ubicacion: string | null; presupuesto: number | null; moneda: string };
export type PropiedadParaCoincidencia = {
  id: string; titulo: string; codigo: string | null; tipo: string; barrio: string | null; ciudad: string | null;
  direccion: string | null; precio: number | null; moneda: string;
};
export type Coincidencia = PropiedadParaCoincidencia & { prioridad: number; precioCercano: boolean; zonaCoincide: boolean };

// Más prioridad cuanto más cerca esté el precio del presupuesto (de arriba o de abajo);
// no hace falta que coincidan del todo. Si no hay datos para comparar (falta precio/presupuesto
// o son de distinta moneda) no suma ni resta: simplemente no es un factor en ese caso.
function prioridadPorPrecio(pedido: PedidoParaCoincidencia, p: PropiedadParaCoincidencia): number {
  if (!pedido.presupuesto || !p.precio || p.moneda !== pedido.moneda) return 0;
  const diferencia = Math.abs(p.precio - pedido.presupuesto) / pedido.presupuesto;
  if (diferencia <= 0.15) return 3; // prácticamente el presupuesto pedido
  if (diferencia <= 0.4) return 2; // cercano
  if (diferencia <= 1) return 1; // todavía en un rango razonable (hasta el doble o la mitad)
  return 0;
}

export function coincidencias(pedido: PedidoParaCoincidencia, disponibles: PropiedadParaCoincidencia[]): Coincidencia[] {
  const palabrasZona = pedido.ubicacion
    ? sinTildes(pedido.ubicacion).split(/[\s,]+/).filter((w) => w.length > 2)
    : [];

  return disponibles
    .filter((p) => p.tipo === pedido.tipo) // único filtro real: mismo tipo de propiedad
    .map((p) => {
      const campo = sinTildes([p.barrio, p.ciudad, p.direccion].filter(Boolean).join(' '));
      const zonaCoincide = palabrasZona.length > 0 && palabrasZona.some((w) => campo.includes(w));
      const porPrecio = prioridadPorPrecio(pedido, p);
      return { ...p, prioridad: porPrecio + (zonaCoincide ? 1 : 0), precioCercano: porPrecio >= 2, zonaCoincide };
    })
    .sort((a, b) => b.prioridad - a.prioridad);
}
