// Horarios libres de un proveedor para los servicios elegidos.
// Es pública: la usa también el link de reservas sin sesión. Solo devuelve horarios,
// nunca los turnos ni la agenda del proveedor.
//
// Entrada: { slug | provider_id, service_ids: string[], desde?: 'AAAA-MM-DD', dias?: number }
// Salida:  { provider, servicios, duracion_total_min, dias: [{ fecha, dia_semana, slots }] }
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ESTADOS_ACTIVOS, calcularHorarios, fechaBA, sumarDias } from '../../shared/disponibilidad.ts';

const MAX_DIAS = 31;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const { slug, provider_id, service_ids } = body;
    const dias = Math.min(Math.max(Number(body.dias) || 7, 1), MAX_DIAS);

    if (!slug && !provider_id) {
      return Response.json({ error: 'Falta el proveedor' }, { status: 400 });
    }
    if (body.desde && !FECHA.test(body.desde)) {
      return Response.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    const [provider] = provider_id
      ? [await db.Provider.get(provider_id).catch(() => null)]
      : await db.Provider.filter({ slug }, undefined, 1);
    if (!provider) return Response.json({ error: 'Proveedor no encontrado' }, { status: 404 });

    // Servicios elegidos: tienen que ser del proveedor y estar activos
    const todos = await db.Service.filter({ provider_id: provider.id });
    const pedidos = Array.isArray(service_ids) ? service_ids : [];
    const servicios = todos.filter((s: any) => s.activo !== false && pedidos.includes(s.id));
    if (!servicios.length || servicios.length !== new Set(pedidos).size) {
      return Response.json({ error: 'Elegí al menos un servicio válido' }, { status: 400 });
    }
    const duracion = servicios.reduce((t: number, s: any) => t + (s.duracion_min || 0), 0);

    const ahora = new Date();
    const desde = body.desde && body.desde > fechaBA(ahora) ? body.desde : fechaBA(ahora);
    const hasta = sumarDias(desde, dias);
    const desdeMs = new Date(`${desde}T00:00:00-03:00`).getTime();
    const hastaMs = new Date(`${hasta}T00:00:00-03:00`).getTime();

    const [semana, excepciones, turnos] = await Promise.all([
      db.Availability.filter({ provider_id: provider.id }),
      db.AvailabilityException.filter({ provider_id: provider.id }),
      // Los más nuevos primero: alcanzan para cubrir los próximos días
      db.Booking.filter({ provider_id: provider.id }, '-inicio', 1000),
    ]);

    // Turnos activos que tocan el período (con un día de colchón por el margen de traslado)
    const ocupados = turnos.filter((t: any) => {
      if (!ESTADOS_ACTIVOS.includes(t.estado)) return false;
      const ini = new Date(t.inicio).getTime();
      const fin = new Date(t.fin).getTime();
      return fin > desdeMs - 86_400_000 && ini < hastaMs + 86_400_000;
    });
    // Etapa 2: sumar acá los eventos ocupados del Google Calendar del proveedor (free/busy).

    const resultado = calcularHorarios({
      desde,
      dias,
      semana,
      excepciones: excepciones.filter((e: any) => e.fecha >= desde && e.fecha < hasta),
      ocupados,
      margenMin: provider.margen_traslado_min ?? 30,
      duracionMin: duracion,
      anticipacionHoras: provider.anticipacion_min_horas ?? 12,
      ahora,
    });

    return Response.json({
      provider: {
        id: provider.id,
        nombre_comercial: provider.nombre_comercial,
        foto_url: provider.foto_url || null,
        slug: provider.slug,
        modo_confirmacion: provider.modo_confirmacion,
      },
      servicios: servicios.map((s: any) => ({ id: s.id, nombre: s.nombre, duracion_min: s.duracion_min })),
      duracion_total_min: duracion,
      dias: resultado,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
