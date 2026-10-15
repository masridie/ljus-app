// Crea un turno. Solo agentes logueados. Vuelve a calcular la disponibilidad en el
// momento de confirmar para que nadie reserve un horario que ya se ocupó.
//
// Entrada: { provider_id, service_ids, fecha: 'AAAA-MM-DD', hora: 'HH:mm', direccion,
//            piso_unidad?, m2?, acceso_tipo, acceso_detalle?, contacto_nombre?,
//            contacto_whatsapp?, avisar_contacto?, notas? }
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

const ACCESOS = ['llaves_inmobiliaria', 'llaves_porteria', 'propietario_presente', 'otro'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

const texto = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const telefono = (v: unknown) => texto(v, 30).replace(/[^\d+]/g, '');

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

    const servicios = await serviciosElegidos(db, provider_id, service_ids);
    if (!servicios) return error('Elegí al menos un servicio válido');
    const duracion = duracionTotal(servicios);

    if (!(await horarioDisponible(db, provider, fecha, hora, duracion))) {
      return error('Ese horario ya no está disponible. Elegí otro.', 409);
    }

    // Perfil de cliente del agente (se crea en su primera reserva)
    let [cliente] = await db.Client.filter({ user_email: user.email }, undefined, 1);
    if (!cliente) {
      cliente = await db.Client.create({ user_email: user.email, nombre: user.full_name || user.email.split('@')[0] });
    }

    const { inicio, fin } = rango(fecha, hora, duracion);

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
      servicios: copiaServicios(servicios),
      duracion_total_min: duracion,
      inicio: isoUTC(inicio),
      fin: isoUTC(fin),
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
      codigo_corto: codigoCorto(),
    });

    if (await perdioCarrera(db, provider, booking)) {
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
