// Textos de los mensajes de WhatsApp. En la Etapa 3 el admin podrá editarlos;
// estos son los valores por defecto y los usa la vista previa de la reserva.
import { TZ } from './disponibilidad.ts';

export const ACCESO_LABEL: Record<string, string> = {
  llaves_inmobiliaria: 'Llaves en la inmobiliaria',
  llaves_porteria: 'Llaves en portería',
  propietario_presente: 'Propietario presente',
  otro: 'Otro',
};

export type TipoMensaje = 'confirmacion' | 'recordatorio';

export const PLANTILLAS: Record<TipoMensaje, string> = {
  confirmacion:
    'Hola {nombre}. Quedó confirmada la sesión de {servicios} en {direccion} para el {fecha} a las {hora}. ' +
    'La hace {fotografo}. Acceso: {acceso}.\n\nDetalle o cambios: {link}',
  recordatorio:
    'Hola {nombre}, te recordamos que en 1 hora, a las {hora}, llega {fotografo} a {direccion} ' +
    'para la sesión de {servicios}. Acceso: {acceso}.\n\nDetalle o cambios: {link}',
};

export type DatosTurno = {
  inicio: string;
  direccion: string;
  piso_unidad?: string;
  servicios: { nombre: string }[];
  acceso_tipo: string;
  acceso_detalle?: string;
  provider_nombre: string;
};

const fmtFecha = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fmtHora = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

export function textoAcceso(t: { acceso_tipo: string; acceso_detalle?: string }): string {
  return t.acceso_tipo === 'otro' && t.acceso_detalle ? t.acceso_detalle : ACCESO_LABEL[t.acceso_tipo] || '';
}

// Reemplaza {campos} de la plantilla con los datos del turno.
export function renderMensaje(plantilla: string, t: DatosTurno, nombre: string, link: string): string {
  const d = new Date(t.inicio);
  const valores: Record<string, string> = {
    nombre,
    servicios: t.servicios.map((s) => s.nombre).join(', ').toLowerCase(),
    direccion: t.piso_unidad ? `${t.direccion} (${t.piso_unidad})` : t.direccion,
    fecha: fmtFecha.format(d).replace(',', ''),
    hora: fmtHora.format(d),
    fotografo: t.provider_nombre,
    acceso: textoAcceso(t).toLowerCase(),
    link,
  };
  return plantilla.replace(/\{(\w+)\}/g, (m, k) => valores[k] ?? m);
}
