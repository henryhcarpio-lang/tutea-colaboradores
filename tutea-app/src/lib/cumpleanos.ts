import { partesEnLima, nombreMes } from "./fecha";

export const DIAS_DE_AVISO = 7;

export type Cumple = {
  /** 1-12 */
  mes: number;
  dia: number;
  /** Años que cumple en la próxima ocurrencia. */
  edad: number;
  /** 0 = hoy. Nunca negativo: si ya pasó, cuenta hasta el año que viene. */
  faltan: number;
  esHoy: boolean;
  /** Dentro de la ventana de aviso, sin contar hoy. */
  seViene: boolean;
  /** "14 de marzo" */
  etiqueta: string;
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * La fecha de nacimiento se guarda en una columna `date`, a medianoche UTC, así
 * que su día y mes se leen en UTC. El "hoy" contra el que se compara, en cambio,
 * es el de Lima: sin eso el confeti saldría el día equivocado en un servidor UTC.
 */
export function calcularCumple(
  fechaNacimiento: Date,
  ahora: Date = new Date(),
): Cumple {
  const nacimiento = new Date(fechaNacimiento);
  const mes = nacimiento.getUTCMonth() + 1;
  const dia = nacimiento.getUTCDate();
  const anioNacimiento = nacimiento.getUTCFullYear();

  const hoy = partesEnLima(ahora);
  const hoyUTC = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);

  // Un 29 de febrero se celebra el 28 en los años que no son bisiestos.
  const diaEn = (anio: number) => {
    const ultimoDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return Math.min(dia, ultimoDelMes);
  };

  let anioProximo = hoy.anio;
  let proximo = Date.UTC(anioProximo, mes - 1, diaEn(anioProximo));
  if (proximo < hoyUTC) {
    anioProximo += 1;
    proximo = Date.UTC(anioProximo, mes - 1, diaEn(anioProximo));
  }

  const faltan = Math.round((proximo - hoyUTC) / MS_POR_DIA);
  const esHoy = faltan === 0;

  return {
    mes,
    dia,
    edad: anioProximo - anioNacimiento,
    faltan,
    esHoy,
    seViene: !esHoy && faltan <= DIAS_DE_AVISO,
    etiqueta: `${dia} de ${nombreMes(mes)}`,
  };
}

/** "hoy" · "mañana" · "en 5 días" */
export function cuentaRegresiva(faltan: number): string {
  if (faltan === 0) return "hoy";
  if (faltan === 1) return "mañana";
  return `en ${faltan} días`;
}
