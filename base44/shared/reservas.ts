// Pasos comunes de crear y reprogramar turnos (funciones backend, con service role).
import { ESTADOS_ACTIVOS, aMinutos, horarioLibre, instante } from './disponibilidad.ts';

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

export function codigoCorto(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

export const isoUTC = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

const activos = (ts: any[], excluirId?: string) =>
  ts.filter((t) => ESTADOS_ACTIVOS.includes(t.estado) && t.id !== excluirId);

// Servicios pedidos, del proveedor, en su orden. permitidos = ids que valen aunque estén pausados.
export async function serviciosElegidos(db: any, provider_id: string, ids: string[], permitidos: string[] = []) {
  const todos = await db.Service.filter({ provider_id });
  const servicios = todos
    .filter((s: any) => ids.includes(s.id) && (s.activo !== false || permitidos.includes(s.id)))
    .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));
  if (!servicios.length || servicios.length !== new Set(ids).size) return null;
  return servicios;
}

export const duracionTotal = (servicios: any[]) => servicios.reduce((t, s) => t + (s.duracion_min || 0), 0);

export const copiaServicios = (servicios: any[]) =>
  servicios.map((s) => ({
    service_id: s.id,
    nombre: s.nombre,
    duracion_min: s.duracion_min,
    ...(s.precio ? { precio: s.precio } : {}),
  }));

// ¿Sigue libre fecha+hora? excluirId: el turno que se está moviendo no se cuenta como ocupado.
export async function horarioDisponible(
  db: any,
  provider: any,
  fecha: string,
  hora: string,
  duracionMin: number,
  excluirId?: string,
): Promise<boolean> {
  const [semana, excepciones, turnos] = await Promise.all([
    db.Availability.filter({ provider_id: provider.id }),
    db.AvailabilityException.filter({ provider_id: provider.id, fecha }),
    db.Booking.filter({ provider_id: provider.id }, '-inicio', 1000),
  ]);
  // Etapa 2: sumar a "ocupados" el free/busy del Google Calendar del fotógrafo.
  return horarioLibre(
    {
      semana,
      excepciones,
      ocupados: activos(turnos, excluirId),
      margenMin: provider.margen_traslado_min ?? 30,
      duracionMin,
      anticipacionHoras: provider.anticipacion_min_horas ?? 12,
      ahora: new Date(),
    },
    fecha,
    hora,
  );
}

export function rango(fecha: string, hora: string, duracionMin: number) {
  const inicio = instante(fecha, aMinutos(hora));
  return { inicio, fin: new Date(inicio.getTime() + duracionMin * 60_000) };
}

// Dos reservas casi simultáneas: si otra pisó el horario del turno recién creado,
// gana la que se creó primero. Devuelve true si hay que deshacer el nuevo.
export async function perdioCarrera(db: any, provider: any, booking: any, excluirId?: string): Promise<boolean> {
  const turnos = activos(await db.Booking.filter({ provider_id: provider.id }, '-inicio', 1000), excluirId);
  const margen = (provider.margen_traslado_min ?? 30) * 60_000;
  const ini = new Date(booking.inicio).getTime();
  const fin = new Date(booking.fin).getTime();
  return turnos.some(
    (t: any) =>
      t.id !== booking.id &&
      new Date(t.inicio).getTime() - margen < fin &&
      new Date(t.fin).getTime() + margen > ini &&
      (t.created_date < booking.created_date || (t.created_date === booking.created_date && t.id < booking.id)),
  );
}
