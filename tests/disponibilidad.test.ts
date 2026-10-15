import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularHorarios,
  diaSemana,
  fechaBA,
  horarioLibre,
  instante,
  rangosDelDia,
  validarRangos,
} from '../base44/shared/disponibilidad.ts';

// Lunes 19 de octubre de 2026
const LUNES = '2026-10-19';
const SEMANA = [
  { dia_semana: 1, activo: true, rangos: [{ inicio: '09:00', fin: '13:00' }] },
  { dia_semana: 2, activo: true, rangos: [{ inicio: '09:00', fin: '18:00' }] },
  { dia_semana: 6, activo: false, rangos: [{ inicio: '09:00', fin: '13:00' }] },
];
// Domingo anterior a la noche: no molesta la anticipación
const AHORA = new Date('2026-10-18T10:00:00-03:00');

const base = {
  desde: LUNES,
  dias: 1,
  semana: SEMANA,
  excepciones: [],
  ocupados: [],
  margenMin: 30,
  duracionMin: 60,
  anticipacionHoras: 12,
  ahora: AHORA,
};

test('fechas y días de la semana en hora de Buenos Aires', () => {
  assert.equal(diaSemana(LUNES), 1);
  assert.equal(diaSemana('2026-10-25'), 7);
  assert.equal(instante(LUNES, 9 * 60).toISOString(), '2026-10-19T12:00:00.000Z');
  // 23:30 en Buenos Aires ya es el día siguiente en UTC
  assert.equal(fechaBA(new Date('2026-10-20T02:30:00Z')), LUNES);
});

test('slots cada 30 minutos que entran completos en el rango', () => {
  const [dia] = calcularHorarios(base);
  assert.deepEqual(dia.slots, ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']);
});

test('la duración total de los servicios recorta el último slot', () => {
  const [dia] = calcularHorarios({ ...base, duracionMin: 150 });
  assert.deepEqual(dia.slots, ['09:00', '09:30', '10:00', '10:30']);
});

test('día inactivo o sin fila no tiene horarios', () => {
  const [sab, dom] = calcularHorarios({ ...base, desde: '2026-10-24', dias: 2 });
  assert.deepEqual(sab.slots, []);
  assert.deepEqual(dom.slots, []);
});

test('un turno ocupa su horario más el margen de traslado antes y después', () => {
  const ocupados = [{ inicio: '2026-10-19T10:30:00-03:00', fin: '2026-10-19T11:30:00-03:00' }];
  const [dia] = calcularHorarios({ ...base, ocupados });
  // Bloqueado de 10:00 a 12:00 (turno 10:30–11:30 + 30 min de cada lado).
  // Un turno de 60 min puede empezar a las 09:00 (termina 10:00) o a las 12:00.
  assert.deepEqual(dia.slots, ['09:00', '12:00']);
});

test('sin margen de traslado los turnos pueden quedar pegados', () => {
  const ocupados = [{ inicio: '2026-10-19T10:30:00-03:00', fin: '2026-10-19T11:30:00-03:00' }];
  const [dia] = calcularHorarios({ ...base, ocupados, margenMin: 0 });
  assert.deepEqual(dia.slots, ['09:00', '09:30', '11:30', '12:00']);
});

test('anticipación mínima: no se ofrecen horarios demasiado cercanos', () => {
  // Lunes 00:00 + 12 h = no antes de las 12:00
  const [dia] = calcularHorarios({ ...base, ahora: new Date('2026-10-19T00:00:00-03:00') });
  assert.deepEqual(dia.slots, ['12:00']);
});

test('bloqueo parcial y de día completo', () => {
  const parcial = calcularHorarios({
    ...base,
    excepciones: [{ fecha: LUNES, tipo: 'bloqueo', inicio: '10:00', fin: '12:00' }],
  });
  assert.deepEqual(parcial[0].slots, ['09:00', '12:00']);

  const completo = calcularHorarios({
    ...base,
    excepciones: [{ fecha: LUNES, tipo: 'bloqueo', dia_completo: true }],
  });
  assert.deepEqual(completo[0].slots, []);
});

test('apertura extra en un día inactivo', () => {
  const [sab] = calcularHorarios({
    ...base,
    desde: '2026-10-24',
    excepciones: [{ fecha: '2026-10-24', tipo: 'apertura', inicio: '10:00', fin: '12:00' }],
  });
  assert.deepEqual(sab.slots, ['10:00', '10:30', '11:00']);
});

test('apertura que se pega a un rango existente se une', () => {
  const ints = rangosDelDia(
    LUNES,
    SEMANA,
    [{ fecha: LUNES, tipo: 'apertura', inicio: '13:00', fin: '15:00' }],
  );
  assert.deepEqual(ints, [[540, 900]]);
});

test('rangos que no arrancan en punto o media se alinean al próximo slot', () => {
  const [dia] = calcularHorarios({
    ...base,
    semana: [{ dia_semana: 1, activo: true, rangos: [{ inicio: '09:15', fin: '11:00' }] }],
  });
  assert.deepEqual(dia.slots, ['09:30', '10:00']);
});

test('una semana devuelve 7 días con su día de la semana', () => {
  const dias = calcularHorarios({ ...base, dias: 7 });
  assert.equal(dias.length, 7);
  assert.deepEqual(dias.map((d) => d.dia_semana), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(dias[1].slots[0], '09:00');
  assert.equal(dias[1].slots.at(-1), '17:00');
});

test('horarioLibre revalida un horario puntual', () => {
  const ocupados = [{ inicio: '2026-10-19T10:30:00-03:00', fin: '2026-10-19T11:30:00-03:00' }];
  const p = { ...base, ocupados };
  assert.equal(horarioLibre(p, LUNES, '09:00'), true);
  assert.equal(horarioLibre(p, LUNES, '10:00'), false);
});

test('validarRangos detecta superposiciones y rangos invertidos', () => {
  assert.equal(validarRangos([{ inicio: '09:00', fin: '13:00' }, { inicio: '14:00', fin: '18:00' }]), null);
  assert.match(validarRangos([{ inicio: '09:00', fin: '13:00' }, { inicio: '12:00', fin: '15:00' }]), /superponen/);
  assert.match(validarRangos([{ inicio: '13:00', fin: '09:00' }]), /termina antes/);
  assert.match(validarRangos([{ inicio: '9', fin: '10:00' }]), /inválida/);
});

test('duración cero es un error', () => {
  assert.throws(() => calcularHorarios({ ...base, duracionMin: 0 }));
});
