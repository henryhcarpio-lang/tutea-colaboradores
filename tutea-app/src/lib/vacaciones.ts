// Funciones puras del módulo de Vacaciones: sin acceso a base de datos, así
// que también las usa el formulario en el navegador para sugerir los días de
// un goce apenas se eligen las dos fechas. La parte que sí toca la base
// (abrir y cerrar períodos) vive en `vacaciones-servidor.ts`.

/**
 * Ventana del año de servicio que contiene `hoy`, a partir de la fecha de
 * ingreso. Cada año arranca en el aniversario exacto del ingreso, no el 1 de
 * enero: alguien que entró el 12 de marzo de 2023 renueva cada 12 de marzo.
 *
 * Devuelve `null` si el ingreso todavía no llegó (fecha futura): no tiene
 * sentido abrirle un período a alguien que aún no empezó a trabajar.
 */
export function ventanaDeServicio(
  ingreso: Date,
  hoy: Date,
): { desde: Date; hasta: Date } | null {
  if (ingreso > hoy) return null;

  const anio = ingreso.getUTCFullYear();
  const mes = ingreso.getUTCMonth();
  const dia = ingreso.getUTCDate();

  let anios = hoy.getUTCFullYear() - anio;
  let desde = new Date(Date.UTC(anio + anios, mes, dia));
  // El aniversario de este año todavía no llegó (ej: ingreso en noviembre,
  // hoy es marzo): la ventana vigente es la del año anterior.
  if (desde > hoy) {
    anios -= 1;
    desde = new Date(Date.UTC(anio + anios, mes, dia));
  }
  const hasta = new Date(Date.UTC(anio + anios + 1, mes, dia));
  return { desde, hasta };
}

/**
 * Cuenta los días hábiles (lunes a sábado, domingo no cuenta) entre dos
 * fechas, ambas incluidas. No descuenta feriados: es una unidad propia del
 * sistema, no el conteo legal de días calendario.
 */
export function diasHabilesLimaSabado(desde: Date, hasta: Date): number {
  if (hasta < desde) return 0;
  const msPorDia = 24 * 60 * 60 * 1000;
  const totalDias = Math.round((hasta.getTime() - desde.getTime()) / msPorDia) + 1;
  const diaSemanaInicio = desde.getUTCDay(); // 0 = domingo
  const primerDomingoOffset = diaSemanaInicio === 0 ? 0 : 7 - diaSemanaInicio;
  if (primerDomingoOffset >= totalDias) return totalDias;
  const domingos = Math.floor((totalDias - primerDomingoOffset - 1) / 7) + 1;
  return totalDias - domingos;
}
