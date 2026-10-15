// Mueve un turno a otro horario. Lo pueden hacer el agente, el fotógrafo del turno o el admin.
// Crea un turno nuevo con los mismos datos de la propiedad y deja el anterior como
// "reprogramado", apuntando al nuevo, para que el link viejo siga sirviendo.
//
// Entrada: { codigo, service_ids, fecha: 'AAAA-MM-DD', hora: 'HH:mm' }
// Salida:  { booking }
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  codigoCorto,
  copiaServicios,
  duracionTotal,
  horarioDisponible,
  isoUTC,
  perdioCarrera,
  rango,
  serviciosElegidos,
} from '../../shared/reservas.ts';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const error = (mensaje: string, status = 400) => Response.json({ error: mensaje }, { status });

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return error('Tenés que ingresar para reprogramar', 401);

    const body = await req.json().catch(() => ({}));
    const { codigo, fecha, hora } = body;
    if (typeof codigo !== 'string' || !codigo) return error('Falta el turno');
    if (!FECHA.test(fecha || '') || !HORA.test(hora || '')) return error('Fecha u hora inválida');

    const db = base44.asServiceRole.entities;
    const [original] = await db.Booking.filter({ codigo_corto: codigo }, undefined, 1);
    if (!original) return error('No encontramos este turno', 404);

    const esProveedor = user.email === original.provider_email;
    if (!esProveedor && user.email !== original.client_email && user.role !== 'admin') {
      return error('Este turno no es tuyo', 403);
    }
    if (!['solicitado', 'confirmado'].includes(original.estado)) {
      return error('Este turno ya no se puede reprogramar');
    }
    if (new Date(original.inicio).getTime() <= Date.now()) return error('Este turno ya pasó');

    const provider = await db.Provider.get(original.provider_id);
    const anteriores = (original.servicios || []).map((s: any) => s.service_id);
    const pedidos = Array.isArray(body.service_ids) && body.service_ids.length ? body.service_ids : anteriores;
    // Los servicios del turno original valen aunque el fotógrafo los haya pausado después.
    const servicios = await serviciosElegidos(db, provider.id, pedidos, anteriores);
    if (!servicios) return error('Elegí al menos un servicio válido');
    const duracion = duracionTotal(servicios);

    if (!(await horarioDisponible(db, provider, fecha, hora, duracion, original.id))) {
      return error('Ese horario ya no está disponible. Elegí otro.', 409);
    }

    const { inicio, fin } = rango(fecha, hora, duracion);
    const {
      id: _id,
      created_date: _c,
      updated_date: _u,
      created_by: _cb,
      created_by_id: _cbi,
      gcal_event_id_proveedor: _g1,
      gcal_event_id_cliente: _g2,
      ...datos
    } = original;

    const nuevo = await db.Booking.create({
      ...datos,
      servicios: copiaServicios(servicios),
      duracion_total_min: duracion,
      inicio: isoUTC(inicio),
      fin: isoUTC(fin),
      // Si reprograma el fotógrafo queda confirmado; si es el agente, sigue el modo del fotógrafo.
      estado: esProveedor || provider.modo_confirmacion !== 'aprobacion' ? 'confirmado' : 'solicitado',
      recordatorio_enviado: false,
      codigo_corto: codigoCorto(),
      reprogramado_desde_id: original.id,
    });

    if (await perdioCarrera(db, provider, nuevo, original.id)) {
      await db.Booking.delete(nuevo.id);
      return error('Ese horario se acaba de ocupar. Elegí otro.', 409);
    }
    await db.Booking.update(original.id, { estado: 'reprogramado' });

    // Etapa 2: mover el evento de Google Calendar. Etapa 3: avisar por WhatsApp.
    return Response.json({ booking: nuevo });
  } catch (e) {
    return error((e as Error).message, 500);
  }
}
