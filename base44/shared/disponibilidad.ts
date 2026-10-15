// Cálculo de horarios libres. Lógica pura, sin acceso a datos: la usan las funciones
// backend (horarios-libres y, más adelante, crear-reserva para revalidar el turno).
//
// Horas en Buenos Aires. Argentina no tiene horario de verano desde 2009, así que se
// trabaja con offset fijo -03:00.

export const TZ = 'America/Argentina/Buenos_Aires';
export const OFFSET = '-03:00';
export const SLOT_MIN = 30;
const DIA_MIN = 24 * 60;

export type Rango = { inicio: string; fin: string };
export type Intervalo = [number, number]; // minutos desde las 00:00 del día
export type Ocupado = { inicio: string | Date; fin: string | Date };

export type DiaDisponibilidad = {
  dia_semana: number; // 1 = lunes ... 7 = domingo
  activo?: boolean;
  rangos?: Rango[];
};

export type Excepcion = {
  fecha: string; // AAAA-MM-DD
  tipo: 'bloqueo' | 'apertura';
  dia_completo?: boolean;
  inicio?: string;
  fin?: string;
};

// "09:30" -> 570. "24:00" vale como fin de día.
export function aMinutos(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const total = Number(m[1]) * 60 + Number(m[2]);
  if (Number(m[2]) > 59 || total > DIA_MIN) throw new Error(`Hora inválida: ${hhmm}`);
  return total;
}

export function aHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Fecha AAAA-MM-DD de un instante, en hora de Buenos Aires.
export function fechaBA(d: Date): string {
  return new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 1 = lunes ... 7 = domingo
export function diaSemana(fecha: string): number {
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dow === 0 ? 7 : dow;
}

// Instante absoluto de una fecha + minutos del día en Buenos Aires.
export function instante(fecha: string, min: number): Date {
  return new Date(new Date(`${fecha}T00:00:00${OFFSET}`).getTime() + min * 60_000);
}

// Valida rangos de un día: formato, inicio < fin y sin superposiciones.
export function validarRangos(rangos: Rango[]): string | null {
  let ints: Intervalo[];
  try {
    ints = rangos.map((r) => [aMinutos(r.inicio), aMinutos(r.fin)]);
  } catch (e) {
    return (e as Error).message;
  }
  for (const [a, b] of ints) {
    if (a >= b) return `El rango ${aHora(a)} – ${aHora(b)} termina antes de empezar`;
  }
  const orden = [...ints].sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < orden.length; i++) {
    if (orden[i][0] < orden[i - 1][1]) {
      return `Los rangos ${aHora(orden[i - 1][0])} – ${aHora(orden[i - 1][1])} y ${aHora(orden[i][0])} – ${aHora(orden[i][1])} se superponen`;
    }
  }
  return null;
}

function unir(ints: Intervalo[]): Intervalo[] {
  const orden = ints.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: Intervalo[] = [];
  for (const [a, b] of orden) {
    const ult = out[out.length - 1];
    if (ult && a <= ult[1]) ult[1] = Math.max(ult[1], b);
    else out.push([a, b]);
  }
  return out;
}

function restar(base: Intervalo[], quitar: Intervalo): Intervalo[] {
  const [qa, qb] = quitar;
  return base.flatMap(([a, b]): Intervalo[] => {
    if (qb <= a || qa >= b) return [[a, b]];
    const partes: Intervalo[] = [];
    if (qa > a) partes.push([a, qa]);
    if (qb < b) partes.push([qb, b]);
    return partes;
  });
}

function intervaloDeExcepcion(ex: Excepcion): Intervalo {
  if (ex.dia_completo || !ex.inicio || !ex.fin) return [0, DIA_MIN];
  return [aMinutos(ex.inicio), aMinutos(ex.fin)];
}

// Rangos disponibles de una fecha: semana − bloqueos + aperturas extra.
export function rangosDelDia(
  fecha: string,
  semana: DiaDisponibilidad[],
  excepciones: Excepcion[],
): Intervalo[] {
  const dow = diaSemana(fecha);
  const dia = semana.find((d) => d.dia_semana === dow);
  let ints: Intervalo[] =
    dia && dia.activo !== false
      ? (dia.rangos || []).map((r) => [aMinutos(r.inicio), aMinutos(r.fin)] as Intervalo)
      : [];
  ints = unir(ints);

  const delDia = excepciones.filter((e) => e.fecha === fecha);
  for (const ex of delDia.filter((e) => e.tipo === 'bloqueo')) {
    ints = restar(ints, intervaloDeExcepcion(ex));
  }
  const aperturas = delDia.filter((e) => e.tipo === 'apertura').map(intervaloDeExcepcion);
  return unir([...ints, ...aperturas]);
}

export type ParamsHorarios = {
  desde: string; // AAAA-MM-DD
  dias: number;
  semana: DiaDisponibilidad[];
  excepciones: Excepcion[];
  ocupados: Ocupado[]; // turnos activos + eventos ocupados del calendario
  margenMin: number; // traslado antes y después de cada ocupado
  duracionMin: number; // duración total de los servicios elegidos
  anticipacionHoras: number;
  ahora: Date;
};

export type HorariosDia = { fecha: string; dia_semana: number; slots: string[] };

// Horarios de inicio libres, cada 30 minutos, para cada día del período.
export function calcularHorarios(p: ParamsHorarios): HorariosDia[] {
  if (!(p.duracionMin > 0)) throw new Error('La duración tiene que ser mayor a cero');
  const margen = Math.max(0, p.margenMin || 0) * 60_000;
  const minimo = p.ahora.getTime() + Math.max(0, p.anticipacionHoras || 0) * 3600_000;
  const ocupados = p.ocupados.map((o) => [
    new Date(o.inicio).getTime() - margen,
    new Date(o.fin).getTime() + margen,
  ]);

  const out: HorariosDia[] = [];
  for (let i = 0; i < p.dias; i++) {
    const fecha = sumarDias(p.desde, i);
    const slots: string[] = [];
    for (const [a, b] of rangosDelDia(fecha, p.semana, p.excepciones)) {
      let inicio = Math.ceil(a / SLOT_MIN) * SLOT_MIN;
      for (; inicio + p.duracionMin <= b; inicio += SLOT_MIN) {
        const ini = instante(fecha, inicio).getTime();
        const fin = ini + p.duracionMin * 60_000;
        if (ini < minimo) continue;
        if (ocupados.some(([oa, ob]) => ini < ob && fin > oa)) continue;
        slots.push(aHora(inicio));
      }
    }
    out.push({ fecha, dia_semana: diaSemana(fecha), slots });
  }
  return out;
}

// ¿Este horario puntual está libre? Para revalidar al confirmar la reserva.
export function horarioLibre(p: Omit<ParamsHorarios, 'desde' | 'dias'>, fecha: string, hora: string): boolean {
  const [dia] = calcularHorarios({ ...p, desde: fecha, dias: 1 });
  return dia.slots.includes(hora);
}

// Estados que ocupan agenda.
export const ESTADOS_ACTIVOS = ['solicitado', 'confirmado', 'realizado', 'material_entregado'];
