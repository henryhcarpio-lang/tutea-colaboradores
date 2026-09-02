import type { DiaSemana } from "@prisma/client";

// La semana laboral de Tutea va de lunes a sábado; el domingo no se registra.
export const DIAS: { clave: DiaSemana; etiqueta: string; corta: string }[] = [
  { clave: "lunes", etiqueta: "Lunes", corta: "Lun" },
  { clave: "martes", etiqueta: "Martes", corta: "Mar" },
  { clave: "miercoles", etiqueta: "Miércoles", corta: "Mié" },
  { clave: "jueves", etiqueta: "Jueves", corta: "Jue" },
  { clave: "viernes", etiqueta: "Viernes", corta: "Vie" },
  { clave: "sabado", etiqueta: "Sábado", corta: "Sáb" },
];

export const CLAVES_DIA = DIAS.map((d) => d.clave);

export type BloqueSimple = {
  diaSemana: DiaSemana;
  horaInicioMin: number;
  horaFinMin: number;
};

/**
 * Las horas se guardan como minutos desde medianoche en vez de `time`: así
 * comparar y detectar solapamientos es aritmética simple, sin zonas horarias
 * de por medio.
 */
export function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

export function aHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "8:00 a 13:00" para mostrar en la cuadrícula. */
export function rangoLegible(inicio: number, fin: number): string {
  return `${aHHMM(inicio)} a ${aHHMM(fin)}`;
}

export function duracionLegible(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Total de minutos trabajados en la semana, para el pie de cada fila. */
export function totalSemanal(bloques: BloqueSimple[]): number {
  return bloques.reduce((t, b) => t + (b.horaFinMin - b.horaInicioMin), 0);
}

/**
 * Revisa un día completo. Devuelve el mensaje de error, o null si está bien.
 * Los bloques del mismo día no pueden solaparse: un colaborador no puede estar
 * en dos sitios a la vez, y si se permitiera el total semanal quedaría inflado.
 */
export function validarDia(
  bloques: { horaInicioMin: number; horaFinMin: number }[],
  etiquetaDia: string,
): string | null {
  for (const b of bloques) {
    if (b.horaFinMin <= b.horaInicioMin) {
      return `${etiquetaDia}: la hora de fin tiene que ser posterior a la de inicio.`;
    }
  }

  const ordenados = [...bloques].sort((a, b) => a.horaInicioMin - b.horaInicioMin);
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].horaInicioMin < ordenados[i - 1].horaFinMin) {
      return `${etiquetaDia}: hay dos bloques que se pisan (${rangoLegible(
        ordenados[i - 1].horaInicioMin,
        ordenados[i - 1].horaFinMin,
      )} y ${rangoLegible(ordenados[i].horaInicioMin, ordenados[i].horaFinMin)}).`;
    }
  }

  return null;
}

/** Agrupa los bloques por día, ya ordenados por hora de inicio. */
export function agruparPorDia<T extends BloqueSimple>(
  bloques: T[],
): Record<DiaSemana, T[]> {
  const porDia = Object.fromEntries(
    CLAVES_DIA.map((d) => [d, [] as T[]]),
  ) as Record<DiaSemana, T[]>;

  for (const b of bloques) porDia[b.diaSemana].push(b);
  for (const d of CLAVES_DIA) {
    porDia[d].sort((a, b) => a.horaInicioMin - b.horaInicioMin);
  }
  return porDia;
}
