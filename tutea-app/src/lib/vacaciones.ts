// Funciones puras del módulo de Vacaciones: sin acceso a base de datos, así
// que también las usa el formulario en el navegador para sugerir los días de
// un goce apenas se eligen las dos fechas. La parte que sí toca la base
// (abrir y cerrar períodos según el contrato vigente) vive en
// `vacaciones-servidor.ts`.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Cuenta los días hábiles (lunes a sábado, domingo no cuenta) entre dos
 * fechas, ambas incluidas. No descuenta feriados: es una unidad propia del
 * sistema, no el conteo legal de días calendario. Se usa para sugerir cuánto
 * gastó un goce puntual (una fecha de inicio y una de fin ya tomadas).
 */
export function diasHabilesLimaSabado(desde: Date, hasta: Date): number {
  if (hasta < desde) return 0;
  const totalDias = Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA) + 1;
  const diaSemanaInicio = desde.getUTCDay(); // 0 = domingo
  const primerDomingoOffset = diaSemanaInicio === 0 ? 0 : 7 - diaSemanaInicio;
  if (primerDomingoOffset >= totalDias) return totalDias;
  const domingos = Math.floor((totalDias - primerDomingoOffset - 1) / 7) + 1;
  return totalDias - domingos;
}

/**
 * El cupo de vacaciones que corresponde por la duración de un contrato: 7
 * días hábiles cada 6 meses, 14 cada año, proporcional para cualquier otra
 * duración. Se calcula sobre un mes "de 30 días" (la misma convención que usa
 * la ley para prorratear beneficios), no sobre el calendario real, para que
 * un contrato de "6 meses" dé siempre 7 sin importar si atraviesa meses de
 * 28, 30 o 31 días.
 */
export function diasPorDuracionDeContrato(desde: Date, hasta: Date): number {
  if (hasta < desde) return 0;
  const diasDeContrato =
    Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA) + 1;
  // 180 días (6 meses de 30) → 7 días de cupo.
  return Math.max(0, Math.round((diasDeContrato / 180) * 7));
}
