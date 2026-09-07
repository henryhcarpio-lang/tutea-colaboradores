import { hoyEnLima, nombreMes } from "./fecha";

/** Lunes a domingo: es la semana real de calendario, distinta de la semana
 * laboral (lunes a sábado) que usa el módulo de Horarios. */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type CeldaMes = {
  /** UTC a medianoche, igual que toda fecha de negocio del sistema. */
  fecha: Date;
  dia: number;
  delMesActual: boolean;
  esHoy: boolean;
};

/**
 * "YYYY-MM" desde la URL a {anio, mes}. Si falta o viene roto, cae en el mes
 * actual según la hora de Lima: la URL de ?mes= es un parámetro que cualquiera
 * puede escribir a mano.
 */
export function parseMes(param: string | undefined): { anio: number; mes: number } {
  if (param) {
    const m = /^(\d{4})-(\d{2})$/.exec(param);
    if (m) {
      const anio = Number(m[1]);
      const mes = Number(m[2]);
      if (mes >= 1 && mes <= 12) return { anio, mes };
    }
  }
  const hoy = hoyEnLima();
  return { anio: hoy.getUTCFullYear(), mes: hoy.getUTCMonth() + 1 };
}

export function claveMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** Mes desplazado `delta` meses, cruzando el límite de año sin problema. */
export function mesAdyacente(
  anio: number,
  mes: number,
  delta: number,
): { anio: number; mes: number } {
  const total = anio * 12 + (mes - 1) + delta;
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 + 1 };
}

/** "Septiembre de 2026" a partir de año y mes. */
export function etiquetaMes(anio: number, mes: number): string {
  const nombre = nombreMes(mes);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} de ${anio}`;
}

/**
 * Seis semanas fijas (42 días), completando con días del mes anterior y
 * siguiente. Un tamaño fijo evita que la grilla cambie de alto al navegar
 * entre meses de 4 y 5 semanas.
 */
export function semanasDelMes(anio: number, mes: number): CeldaMes[][] {
  const primerDiaMes = new Date(Date.UTC(anio, mes - 1, 1));
  // getUTCDay: 0=domingo…6=sábado. Se convierte a offset desde el lunes.
  const offsetLunes = (primerDiaMes.getUTCDay() + 6) % 7;

  const inicio = new Date(primerDiaMes);
  inicio.setUTCDate(inicio.getUTCDate() - offsetLunes);

  const hoy = hoyEnLima();
  const semanas: CeldaMes[][] = [];
  const cursor = new Date(inicio);

  for (let semana = 0; semana < 6; semana++) {
    const fila: CeldaMes[] = [];
    for (let dia = 0; dia < 7; dia++) {
      fila.push({
        fecha: new Date(cursor),
        dia: cursor.getUTCDate(),
        delMesActual:
          cursor.getUTCMonth() === mes - 1 && cursor.getUTCFullYear() === anio,
        esHoy: cursor.getTime() === hoy.getTime(),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    semanas.push(fila);
  }
  return semanas;
}

/** "YYYY-MM-DD" a partir de un ISO completo, para agrupar sin líos de huso horario. */
export function aFechaISO(iso: string): string {
  return iso.slice(0, 10);
}
