// Crea un turno. Solo agentes logueados. Vuelve a calcular la disponibilidad en el
// momento de confirmar para que nadie reserve un horario que ya se ocupó.
//
// Entrada: { provider_id, service_ids, fecha: 'AAAA-MM-DD', hora: 'HH:mm', direccion,
//            piso_unidad?, m2?, acceso_tipo, acceso_detalle?, contacto_nombre?,
//            contacto_whatsapp?, avisar_contacto?, notas? }
// Salida:  { booking }
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ESTADOS_ACTIVOS, aMinutos, horarioLibre, instante } from '../../shared/disponibilidad.ts';

const ACCESOS = ['llaves_inmobiliaria', 'llaves_porteria', 'propietario_presente', 'otro'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

const texto = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const telefono = (v: unknown) => texto(v, 30).replace(/[^\d+]/g, '');

function codigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

const error = (mensaje: string, status = 400) => Response.json({ error: mensaje }, { status });

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return error('Tenés que ingresar para reservar', 401);
    if (user.tipo !== 'agente' && user.role !== 'admin') {
      return error('Las reservas se hacen con una cuenta de agente', 403);
    }

    const body = await req.json().catch(() => ({}));
    const { provider_id, fecha, hora } = body;
    const service_ids: string[] = Array.isArray(body.service_ids) ? body.service_ids : [];
    const direccion = texto(body.direccion, 200);
    const acceso_tipo = body.acceso_tipo;
    const acceso_detalle = texto(body.acceso_detalle);
    const contacto_nombre = texto(body.contacto_nombre, 100);
    const contacto_whatsapp = telefono(body.contacto_whatsapp);
    const avisar_contacto = !!body.avisar_contacto;
    const m2 = body.m2 === '' || body.m2 == null ? undefined : Number(body.m2);

    if (!provider_id) return error('Falta el fotógrafo');
    if (!FECHA.test(fecha || '') || !HORA.test(hora || '')) return error('Fecha u hora inválida');
    if (!direccion) return error('Falta la dirección');
    if (!ACCESOS.includes(acceso_tipo)) return error('Elegí cómo se accede');
    if (acceso_tipo === 'otro' && !acceso_detalle) return error('Contanos cómo se accede');
    if (m2 !== undefined && (!Number.isFinite(m2) || m2 <= 0)) return error('Revisá los m²');
    if (avisar_contacto && (!contacto_nombre || contacto_whatsapp.replace(/\D/g, '').length < 8)) {
      return error('Para avisarle por WhatsApp necesitamos el nombre y el WhatsApp del contacto');
    }

    const db = base44.asServiceRole.entities;
    const provider = await db.Provider.get(provider_id).catch(() => null);
    if (!provider) return error('Fotógrafo no encontrado', 404);

    const todos = await db.Service.filter({ provider_id });
    const servicios = todos
      .filter((s: any) => s.activo !== false && service_ids.includes(s.id))
      .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));
    if (!servicios.length || servicios.length !== new Set(service_ids).size) {
      return error('Elegí al menos un servicio válido');
    }
    const duracion = servicios.reduce((t: number, s: any) => t + (s.duracion_min || 0), 0);

    const [semana, excepciones, turnos] = await Promise.all([
      db.Availability.filter({ provider_id }),
      db.AvailabilityException.filter({ provider_id, fecha }),
      db.Booking.filter({ provider_id }, '-inicio', 1000),
    ]);
    const activos = (ts: any[]) => ts.filter((t) => ESTADOS_ACTIVOS.includes(t.estado));
    const params = {
      semana,
      excepciones,
      ocupados: activos(turnos),
      margenMin: provider.margen_traslado_min ?? 30,
      duracionMin: duracion,
      anticipacionHoras: provider.anticipacion_min_horas ?? 12,
      ahora: new Date(),
    };
    // Etapa 2: sumar a "ocupados" el free/busy del Google Calendar del fotógrafo.
    if (!horarioLibre(params, fecha, hora)) {
      return error('Ese horario ya no está disponible. Elegí otro.', 409);
    }

    // Perfil de cliente del agente (se crea en su primera reserva)
    let [cliente] = await db.Client.filter({ user_email: user.email }, undefined, 1);
    if (!cliente) {
      cliente = await db.Client.create({ user_email: user.email, nombre: user.full_name || user.email.split('@')[0] });
    }

    const inicio = instante(fecha, aMinutos(hora));
    const fin = new Date(inicio.getTime() + duracion * 60_000);
    const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

    const booking = await db.Booking.create({
      provider_id,
      provider_email: provider.user_email,
      provider_nombre: provider.nombre_comercial,
      ...(provider.whatsapp && { provider_whatsapp: provider.whatsapp }),
      client_id: cliente.id,
      client_email: user.email,
      client_nombre: cliente.nombre,
      ...(cliente.inmobiliaria && { client_inmobiliaria: cliente.inmobiliaria }),
      ...(cliente.whatsapp && { client_whatsapp: cliente.whatsapp }),
      servicios: servicios.map((s: any) => ({
        service_id: s.id,
        nombre: s.nombre,
        duracion_min: s.duracion_min,
        ...(s.precio ? { precio: s.precio } : {}),
      })),
      duracion_total_min: duracion,
      inicio: iso(inicio),
      fin: iso(fin),
      estado: provider.modo_confirmacion === 'aprobacion' ? 'solicitado' : 'confirmado',
      direccion,
      ...(texto(body.piso_unidad, 50) && { piso_unidad: texto(body.piso_unidad, 50) }),
      ...(m2 !== undefined && { m2 }),
      acceso_tipo,
      ...(acceso_tipo === 'otro' && { acceso_detalle }),
      ...(contacto_nombre && { contacto_nombre }),
      ...(contacto_whatsapp && { contacto_whatsapp }),
      avisar_contacto,
      ...(texto(body.notas, 1000) && { notas: texto(body.notas, 1000) }),
      recordatorio_enviado: false,
      codigo_corto: codigo(),
    });

    // Dos reservas casi simultáneas: si otra pisó este horario, gana la que se creó primero.
    const despues = activos(await db.Booking.filter({ provider_id }, '-inicio', 1000));
    const margen = (provider.margen_traslado_min ?? 30) * 60_000;
    const choca = despues.find(
      (t: any) =>
        t.id !== booking.id &&
        new Date(t.inicio).getTime() - margen < fin.getTime() &&
        new Date(t.fin).getTime() + margen > inicio.getTime() &&
        (t.created_date < booking.created_date || (t.created_date === booking.created_date && t.id < booking.id)),
    );
    if (choca) {
      await db.Booking.delete(booking.id);
      return error('Ese horario se acaba de ocupar. Elegí otro.', 409);
    }

    // Etapa 2: crear el evento en Google Calendar del fotógrafo y del agente.
    // Etapa 3: avisos por WhatsApp (webhook).
    return Response.json({ booking });
  } catch (e) {
    return error((e as Error).message, 500);
  }
}
