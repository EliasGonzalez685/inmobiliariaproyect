import { guardarOperacion, eliminarOperacion } from '@/app/(app)/operaciones/actions';
import { guardarCliente, eliminarCliente } from '@/app/(app)/clientes/actions';
import {
  guardarPropiedad, cambiarEstadoPropiedad, eliminarPropiedad,
  agregarMantenimiento, cambiarEstadoMantenimiento, eliminarMantenimiento,
} from '@/app/(app)/propiedades/actions';

type A = any[];

/**
 * Acciones que el navegador puede pedir con una petición normal (fetch) a /api/accion/<nombre>.
 * Cada una sigue validando la sesión y los permisos por su cuenta; aquí solo se enlazan los argumentos.
 */
export const REGISTRO: Record<string, (a: A, fd: FormData) => Promise<unknown>> = {
  guardarOperacion: (a, fd) => guardarOperacion(a[0] ?? null, null, fd),
  eliminarOperacion: (a) => eliminarOperacion(String(a[0]), a[1] ? String(a[1]) : undefined),
  guardarCliente: (a, fd) => guardarCliente(a[0] ?? null, null, fd),
  eliminarCliente: (a) => eliminarCliente(String(a[0])),
  guardarPropiedad: (a, fd) => guardarPropiedad(a[0] ?? null, fd),
  cambiarEstadoPropiedad: (a) => cambiarEstadoPropiedad(String(a[0]), String(a[1]), a[2] ?? null),
  eliminarPropiedad: (a) => eliminarPropiedad(String(a[0])),
  agregarMantenimiento: async (a, fd) => { await agregarMantenimiento(String(a[0]), fd); return {}; },
  cambiarEstadoMantenimiento: async (a) => { await cambiarEstadoMantenimiento(String(a[0]), String(a[1]), String(a[2])); return {}; },
  eliminarMantenimiento: async (a) => { await eliminarMantenimiento(String(a[0]), String(a[1])); return {}; },
};
