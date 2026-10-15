import { TZ } from '@shared/disponibilidad.ts';

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const limpiar = (s) => s.replace(/\./g, '').replace(/,/g, '');

const fmtDia = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

// '2026-10-20' -> 'Mar 20 oct'
export function fechaCorta(fecha) {
  return capitalizar(limpiar(fmtDia.format(new Date(`${fecha}T12:00:00-03:00`))));
}

// ISO -> '12:30' en hora de Buenos Aires
export function hora(iso) {
  return fmtHora.format(new Date(iso));
}

// ISO -> 'Lun 19 oct, 12:30'
export function fechaHora(iso) {
  return `${capitalizar(limpiar(fmtDia.format(new Date(iso))))}, ${hora(iso)}`;
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
