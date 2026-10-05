import Link from '@/components/LinkSeguro';
import { CalendarRange, CheckCircle2, CircleAlert, Handshake, Pencil, Percent, Plus, Trash2, User } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import ConfirmForm from '@/components/ConfirmForm';
import { ESTADOS_OPERACION, ESTADO_OPERACION_COLOR, OPERACION_COLOR, etiquetaOperacion } from '@/lib/constants';
import { formatoFecha, formatoMonto } from '@/lib/format';

export default async function OperacionesTab({ propiedadId }: { propiedadId: string }) {
  const { supabase } = await requireProfile();
  const { data: items } = await supabase.from('operaciones')
    .select('*, clientes(nombre)').eq('propiedad_id', propiedadId).order('fecha', { ascending: false }).order('created_at', { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Historial de ventas, alquileres y reservas de esta propiedad.</p>
        <Link href={`/operaciones/nueva?propiedad=${propiedadId}`} className="btn btn-sm"><Plus className="h-4 w-4" /> Registrar operación</Link>
      </div>

      {(items ?? []).length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <span className="icon-chip bg-brand-50 text-brand-600"><Handshake className="h-5 w-5" /></span>
          <h2 className="mt-4">Sin operaciones registradas</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">Cuando se venda, alquile o reserve esta propiedad, regístralo aquí.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(items ?? []).map((o) => {
            const cliente = (o.clientes as unknown as { nombre: string } | null)?.nombre ?? o.cliente_nombre;
            return (
              <li key={o.id} className="card !p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`badge ${OPERACION_COLOR[o.tipo]}`}>{etiquetaOperacion(o)}</span>
                  <span className={`badge ${ESTADO_OPERACION_COLOR[o.estado]}`}>{ESTADOS_OPERACION[o.estado as keyof typeof ESTADOS_OPERACION]}</span>
                  <span className="ml-auto text-lg font-bold text-slate-900">{o.monto !== null ? formatoMonto(o.monto, o.moneda) : '—'}</span>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{formatoFecha(o.fecha)}</span>
                  {cliente && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{cliente}</span>}
                  {o.comision !== null && <span className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" />Comisión {formatoMonto(o.comision, o.moneda)}</span>}
                  {o.tipo === 'alquiler' && o.fecha_inicio && <span>Contrato {formatoFecha(o.fecha_inicio)}{o.fecha_fin ? ` → ${formatoFecha(o.fecha_fin)}` : ''}</span>}
                  {o.forma_pago && <span>{o.forma_pago}</span>}
                </p>
                {o.comision !== null && (
                  <span className={`badge mt-2 ${o.comision_pagada ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> {o.comision_pagada ? `Comisión pagada${o.comision_fecha_pago ? ` · ${formatoFecha(o.comision_fecha_pago)}` : ''}` : 'Comisión pendiente de pago'}
                  </span>
                )}
                {o.estado !== 'cancelada' && (o.comision === null || !o.forma_pago) && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><CircleAlert className="h-3.5 w-3.5" /> Faltan datos: {[o.comision === null && 'comisión', !o.forma_pago && 'forma de pago'].filter(Boolean).join(' y ')}</p>
                )}
                {o.notas && <p className="mt-1.5 text-xs text-slate-400">{o.notas}</p>}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/operaciones/${o.id}/editar?volver=${propiedadId}`} className="btn-secondary btn-sm"><Pencil className="h-4 w-4" /> Editar</Link>
                  {o.comision !== null && (
                    <ConfirmForm accion="cambiarComisionPagada" args={[o.id, !o.comision_pagada]} className={o.comision_pagada ? 'btn-secondary btn-sm' : 'btn btn-sm'}>
                      <CheckCircle2 className="h-4 w-4" /> {o.comision_pagada ? 'Marcar pendiente' : 'Marcar comisión pagada'}
                    </ConfirmForm>
                  )}
                  <ConfirmForm accion="eliminarOperacion" args={[o.id, propiedadId]} mensaje="¿Eliminar esta operación? No se puede deshacer." className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /> Eliminar</ConfirmForm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
