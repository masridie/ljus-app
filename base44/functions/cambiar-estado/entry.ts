// Cambia el estado de un turno. Los turnos no se editan directo desde el frontend:
// todo cambio pasa por acá para validar quién puede hacer qué.
//
// Entrada: { codigo, accion, material_url? }
//   aprobar    solicitado            -> confirmado          (fotógrafo)
//   rechazar   solicitado            -> rechazado           (fotógrafo)
//   cancelar   solicitado|confirmado -> cancelado           (fotógrafo o agente)
//   realizado  confirmado            -> realizado           (fotógrafo)
//   material   confirmado|realizado|material_entregado -> material_entregado (fotógrafo)
// Salida: { booking }
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const ACCIONES: Record<string, { desde: string[]; hacia: string; quien: ('proveedor' | 'cliente')[] }> = {
  aprobar: { desde: ['solicitado'], hacia: 'confirmado', quien: ['proveedor'] },
  rechazar: { desde: ['solicitado'], hacia: 'rechazado', quien: ['proveedor'] },
  cancelar: { desde: ['solicitado', 'confirmado'], hacia: 'cancelado', quien: ['proveedor', 'cliente'] },
  realizado: { desde: ['confirmado'], hacia: 'realizado', quien: ['proveedor'] },
  material: { desde: ['confirmado', 'realizado', 'material_entregado'], hacia: 'material_entregado', quien: ['proveedor'] },
};

const error = (mensaje: string, status = 400) => Response.json({ error: mensaje }, { status });

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return error('Tenés que ingresar', 401);

    const { codigo, accion, material_url } = await req.json().catch(() => ({}));
    const regla = ACCIONES[accion];
    if (!regla) return error('Acción inválida');
    if (typeof codigo !== 'string' || !codigo) return error('Falta el turno');

    const db = base44.asServiceRole.entities;
    const [t] = await db.Booking.filter({ codigo_corto: codigo }, undefined, 1);
    if (!t) return error('No encontramos este turno', 404);

    const rol = user.email === t.provider_email ? 'proveedor' : user.email === t.client_email ? 'cliente' : null;
    if (user.role !== 'admin' && (!rol || !regla.quien.includes(rol))) {
      return error('No podés hacer este cambio en este turno', 403);
    }
    if (!regla.desde.includes(t.estado)) {
      return error('El turno ya cambió de estado. Actualizá la pantalla.', 409);
    }

    const cambios: Record<string, unknown> = { estado: regla.hacia };
    if (accion === 'material') {
      let url: URL | null = null;
      try {
        url = new URL(String(material_url || '').trim());
      } catch {
        url = null;
      }
      if (!url || !['http:', 'https:'].includes(url.protocol)) return error('Pegá un link válido (https://...)');
      cambios.material_url = url.toString();
    }

    const booking = await db.Booking.update(t.id, cambios);
    // Etapa 2: actualizar o borrar el evento de Google Calendar.
    // Etapa 3: avisar por WhatsApp (confirmado / cancelado).
    return Response.json({ booking });
  } catch (e) {
    return error((e as Error).message, 500);
  }
}
