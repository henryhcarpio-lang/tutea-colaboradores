// Toda fecha con significado de negocio (cumpleaños "de hoy", día de uso de una
// vida, corte mensual) se calcula en America/Lima. Los servidores corren en UTC,
// así que sin esto el confeti de cumpleaños saldría el día equivocado.

export const ZONA_HORARIA = "America/Lima";

const formateadorPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Partes año/mes/día de un instante, ya convertido a hora de Lima. */
export function partesEnLima(instante: Date = new Date()) {
  const partes = formateadorPartes.formatToParts(instante);
  const buscar = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  return {
    anio: buscar("year"),
    mes: buscar("month"),
    dia: buscar("day"),
  };
}

/** Período mensual en el formato invariante YYYY-MM. */
export function mesPeriodoActual(instante: Date = new Date()): string {
  const { anio, mes } = partesEnLima(instante);
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** Fecha de hoy en Lima, normalizada a medianoche UTC para columnas `date`. */
export function hoyEnLima(instante: Date = new Date()): Date {
  const { anio, mes, dia } = partesEnLima(instante);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreMes(mes1a12: number): string {
  return NOMBRES_MES[mes1a12 - 1] ?? "";
}

/** "septiembre de 2026" a partir de un período YYYY-MM. */
export function etiquetaMesPeriodo(mesPeriodo: string): string {
  const [anio, mes] = mesPeriodo.split("-");
  return `${nombreMes(Number(mes))} de ${anio}`;
}
