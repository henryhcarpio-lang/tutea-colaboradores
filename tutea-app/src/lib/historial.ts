import type { DiaSemana } from "@prisma/client";
import { CLAVES_DIA, DIAS } from "./horarios";

/** Forma de los snapshots guardados en ScheduleHistory. */
export type BloqueSnapshot = {
  diaSemana: DiaSemana;
  inicio: number;
  fin: number;
};

/**
 * Los snapshots vienen de una columna JSON, así que podrían tener cualquier
 * forma. Se validan al leerlos en vez de confiar en el tipo.
 */
export function leerSnapshot(valor: unknown): BloqueSnapshot[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (b): b is BloqueSnapshot =>
      typeof b === "object" &&
      b !== null &&
      CLAVES_DIA.includes((b as BloqueSnapshot).diaSemana) &&
      typeof (b as BloqueSnapshot).inicio === "number" &&
      typeof (b as BloqueSnapshot).fin === "number",
  );
}

export function porDia(
  snapshot: BloqueSnapshot[],
  dia: DiaSemana,
): BloqueSnapshot[] {
  return snapshot
    .filter((b) => b.diaSemana === dia)
    .sort((a, b) => a.inicio - b.inicio);
}

function iguales(a: BloqueSnapshot[], b: BloqueSnapshot[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.inicio === b[i].inicio && x.fin === b[i].fin);
}

/** Días cuyo horario cambió entre dos snapshots. */
export function diasCambiados(
  anterior: BloqueSnapshot[],
  nuevo: BloqueSnapshot[],
): DiaSemana[] {
  return CLAVES_DIA.filter(
    (dia) => !iguales(porDia(anterior, dia), porDia(nuevo, dia)),
  );
}

/** "Martes y jueves" / "Lunes, miércoles y viernes". */
export function resumirDias(dias: DiaSemana[]): string {
  const nombres = dias.map(
    (d) => DIAS.find((x) => x.clave === d)!.etiqueta.toLowerCase(),
  );
  if (nombres.length === 0) return "sin cambios";
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

export function totalMinutos(snapshot: BloqueSnapshot[]): number {
  return snapshot.reduce((t, b) => t + (b.fin - b.inicio), 0);
}
