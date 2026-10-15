// Turno por su código corto, para el link público que va en los mensajes.
// Pública: el código es aleatorio y no adivinable. Nunca devuelve teléfonos ni emails;
// las notas solo las ven el agente y el fotógrafo del turno.
//
// Entrada: { codigo }
// Salida:  { turno, rol: 'cliente' | 'proveedor' | 'admin' | null }
//          turno.nuevo_codigo: si se reprogramó, el código del turno nuevo
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { codigo } = await req.json().catch(() => ({}));
    if (typeof codigo !== 'string' || !/^[a-z0-9]{6,16}$/.test(codigo)) {
      return Response.json({ error: 'Código inválido' }, { status: 400 });
    }

    const [t] = await base44.asServiceRole.entities.Booking.filter({ codigo_corto: codigo }, undefined, 1);
    if (!t) return Response.json({ error: 'No encontramos este turno' }, { status: 404 });
    const provider = await base44.asServiceRole.entities.Provider.get(t.provider_id).catch(() => null);
    // Si se reprogramó, el link viejo lleva al turno nuevo
    const [nuevo] =
      t.estado === 'reprogramado'
        ? await base44.asServiceRole.entities.Booking.filter({ reprogramado_desde_id: t.id }, '-created_date', 1)
        : [];

    const user = await base44.auth.me().catch(() => null);
    const rol = !user
      ? null
      : user.role === 'admin'
        ? 'admin'
        : user.email === t.client_email
          ? 'cliente'
          : user.email === t.provider_email
            ? 'proveedor'
            : null;

    return Response.json({
      rol,
      turno: {
        codigo: t.codigo_corto,
        estado: t.estado,
        inicio: t.inicio,
        fin: t.fin,
        servicios: (t.servicios || []).map((s: any) => ({ service_id: s.service_id, nombre: s.nombre, duracion_min: s.duracion_min })),
        duracion_total_min: t.duracion_total_min,
        direccion: t.direccion,
        piso_unidad: t.piso_unidad || null,
        m2: t.m2 || null,
        acceso_tipo: t.acceso_tipo,
        acceso_detalle: t.acceso_detalle || null,
        contacto_nombre: t.contacto_nombre || null,
        avisar_contacto: !!t.avisar_contacto,
        provider_nombre: t.provider_nombre,
        provider_slug: provider?.slug || null,
        client_nombre: t.client_nombre,
        client_inmobiliaria: t.client_inmobiliaria || null,
        material_url: t.material_url || null,
        nuevo_codigo: nuevo?.codigo_corto || null,
        en_calendario: !!(t.gcal_event_id_proveedor || t.gcal_event_id_cliente),
        ...(rol && { notas: t.notas || null }),
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
