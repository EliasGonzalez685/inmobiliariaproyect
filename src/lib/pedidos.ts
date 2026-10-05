// Cruce entre un pedido de un cliente y las propiedades disponibles, para avisar cuando alguna podría
// servirle (mismo tipo, zona parecida y precio dentro del presupuesto con algo de margen).
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type PedidoParaCoincidencia = { tipo: string; ubicacion: string | null; presupuesto: number | null; moneda: string };
export type PropiedadParaCoincidencia = {
  id: string; titulo: string; codigo: string | null; tipo: string; barrio: string | null; ciudad: string | null;
  direccion: string | null; precio: number | null; moneda: string;
};

const MARGEN_PRESUPUESTO = 1.15; // 15% de margen: a veces el precio publicado cede un poco

export function coincidencias(pedido: PedidoParaCoincidencia, disponibles: PropiedadParaCoincidencia[]): PropiedadParaCoincidencia[] {
  const palabrasZona = pedido.ubicacion
    ? sinTildes(pedido.ubicacion).split(/[\s,]+/).filter((w) => w.length > 2)
    : [];

  return disponibles.filter((p) => {
    if (p.tipo !== pedido.tipo) return false;
    if (pedido.presupuesto && p.precio && p.moneda === pedido.moneda && Number(p.precio) > Number(pedido.presupuesto) * MARGEN_PRESUPUESTO) return false;
    if (palabrasZona.length) {
      const campo = sinTildes([p.barrio, p.ciudad, p.direccion].filter(Boolean).join(' '));
      if (!palabrasZona.some((w) => campo.includes(w))) return false;
    }
    return true;
  });
}
