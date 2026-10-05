export const TIPOS_PROPIEDAD = {
  casa: 'Casa', departamento: 'Departamento', duplex: 'Dúplex', terreno: 'Terreno', local: 'Local comercial',
  oficina: 'Oficina', deposito: 'Depósito', quinta: 'Quinta', otro: 'Otro',
} as const;

export const ESTADOS_PROPIEDAD = {
  disponible: 'Disponible', reservada: 'Reservada', ocupada: 'Ocupada', alquilada: 'Alquilada',
  vendida: 'Vendida', en_mantenimiento: 'En mantenimiento', otro: 'Otro',
} as const;

export const ESTADO_COLOR: Record<string, string> = {
  disponible: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  reservada: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  ocupada: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  alquilada: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  vendida: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  en_mantenimiento: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  otro: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
};

// Color del punto/gráfico de cada estado
export const ESTADO_HEX: Record<string, string> = {
  disponible: '#10b981', reservada: '#f59e0b', ocupada: '#6366f1',
  alquilada: '#0ea5e9', vendida: '#94a3b8', en_mantenimiento: '#f97316', otro: '#8b5cf6',
};

export const OPERACIONES = { venta: 'Venta', alquiler: 'Alquiler', administracion: 'Administración' } as const;
export const TIPOS_CLIENTE = { propietario: 'Propietario', inquilino: 'Inquilino', comprador: 'Comprador', otro: 'Otro' } as const;
export const MONEDAS = { PYG: 'Gs.', USD: 'US$' } as const;

export const CATEGORIAS_FOTO = {
  estado_general: 'Estado general', estructura: 'Estructura', acabados: 'Acabados', instalaciones: 'Instalaciones',
  antes: 'Antes de mejora', despues: 'Después de mejora', ocupacion_inicio: 'Inicio de ocupación',
  ocupacion_final: 'Final de ocupación', deterioro: 'Deterioro', otro: 'Otro',
} as const;

export const TIPOS_DOCUMENTO = {
  escritura: 'Escritura', titulo: 'Título', plano: 'Plano', impuesto: 'Impuesto', contrato: 'Contrato',
  habilitacion: 'Habilitación', seguro: 'Seguro', servicio: 'Servicio', otro: 'Otro',
} as const;

export const TIPOS_MANTENIMIENTO = { preventivo: 'Preventivo', correctivo: 'Correctivo', mejora: 'Mejora' } as const;
export const ESTADOS_MANTENIMIENTO = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Completado' } as const;
export const SERVICIOS = ['Agua corriente', 'Energía eléctrica', 'Internet', 'Pavimento', 'Alumbrado público', 'Recolección de basura'];

type ConTipoEstado = { tipo?: string | null; tipo_otro?: string | null; estado?: string | null; estado_otro?: string | null };

/** Nombre del tipo: si es "Otro" y se escribió uno, muestra lo escrito. */
export function etiquetaTipo(p: ConTipoEstado) {
  if (p.tipo === 'otro' && p.tipo_otro) return p.tipo_otro;
  return TIPOS_PROPIEDAD[p.tipo as keyof typeof TIPOS_PROPIEDAD] ?? '';
}

/** Nombre del estado: si es "Otro" y se escribió uno, muestra lo escrito. */
export function etiquetaEstado(p: ConTipoEstado) {
  if (p.estado === 'otro' && p.estado_otro) return p.estado_otro;
  return ESTADOS_PROPIEDAD[p.estado as keyof typeof ESTADOS_PROPIEDAD] ?? '';
}

/** Tipo de cliente: si es "Otro" y se escribió uno, muestra lo escrito. */
export function etiquetaCliente(c: { tipo?: string | null; tipo_otro?: string | null }) {
  if (c.tipo === 'otro' && c.tipo_otro) return c.tipo_otro;
  return TIPOS_CLIENTE[c.tipo as keyof typeof TIPOS_CLIENTE] ?? '';
}

// ───────── Operaciones (ventas, alquileres, reservas…) ─────────
export const TIPOS_OPERACION = { venta: 'Venta', alquiler: 'Alquiler', reserva: 'Reserva', otro: 'Otro' } as const;
export const ESTADOS_OPERACION = { concretada: 'Concretada', en_curso: 'En curso', cancelada: 'Cancelada' } as const;

export const OPERACION_HEX: Record<string, string> = { venta: '#6366f1', alquiler: '#0ea5e9', reserva: '#f59e0b', otro: '#94a3b8' };
export const OPERACION_COLOR: Record<string, string> = {
  venta: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  alquiler: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  reserva: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  otro: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};
export const ESTADO_OPERACION_COLOR: Record<string, string> = {
  concretada: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  en_curso: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  cancelada: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};
/** Estado que toma la propiedad al registrar cada tipo de operación. */
export const ESTADO_POR_OPERACION: Record<string, keyof typeof ESTADOS_PROPIEDAD> = { venta: 'vendida', alquiler: 'alquilada', reserva: 'reservada' };

export function etiquetaOperacion(o: { tipo?: string | null; tipo_otro?: string | null }) {
  if (o.tipo === 'otro' && o.tipo_otro) return o.tipo_otro;
  return TIPOS_OPERACION[o.tipo as keyof typeof TIPOS_OPERACION] ?? '';
}
