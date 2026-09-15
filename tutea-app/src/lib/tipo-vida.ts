import type { TipoVida } from "@prisma/client";

/**
 * El color de los motivos corrientes. Se exporta porque el corazón excedido
 * necesita saber cuáles son "neutros": esos sí se pintan de rojo oscuro
 * cuando pasan el cupo, los de color propio (médico, desastre) conservan el
 * suyo para no perder el motivo.
 */
export const GRIS_NEUTRO = "#d4d8e0";
const GRIS = GRIS_NEUTRO;

/**
 * Motivo de un permiso, para pintar el corazón distinto según la razón:
 * celeste con curita para descanso médico, verde para desastre natural, y
 * gris para los dos motivos corrientes —permiso recuperable (se repone
 * trabajando otro día) y omitir una tardanza—, que se distinguen entre sí
 * por el reloj que lleva encima el de tardanza.
 *
 * `descuentaCupo` marca cuáles restan del cupo mensual: un descanso médico o
 * un desastre natural no son una falta que la persona "gaste" de su cuenta,
 * así que quedan registrados (gerencia necesita el dato) pero no le cuestan
 * una vida. Los otros tres sí, porque ahí la vida es justamente el permiso
 * que la persona está usando.
 */
export const TIPOS_VIDA: Record<
  TipoVida,
  { etiqueta: string; color: string; descuentaCupo: boolean }
> = {
  // `general` ya no se puede elegir (no está en LISTA_TIPOS_VIDA), pero sigue
  // aquí para que los permisos viejos registrados con ese motivo se sigan
  // mostrando bien en el historial: un dato ya guardado no se reescribe.
  general: { etiqueta: "General", color: GRIS, descuentaCupo: true },
  medico: { etiqueta: "Descanso médico", color: "#38bdf8", descuentaCupo: false },
  desastre: { etiqueta: "Desastre natural", color: "#22c55e", descuentaCupo: false },
  recuperable: { etiqueta: "Permiso recuperable", color: GRIS, descuentaCupo: true },
  tardanza: { etiqueta: "Omitir tardanza", color: GRIS, descuentaCupo: true },
};

/** Los que se pueden elegir hoy al registrar un permiso. */
export const LISTA_TIPOS_VIDA: TipoVida[] = [
  "recuperable",
  "tardanza",
  "medico",
  "desastre",
];

/**
 * Cuántos de estos usos le cuestan una vida del cupo. Vive acá, no en cada
 * pantalla, para que "cuáles descuentan" se decida en un solo lugar.
 */
export function contarQueDescuentan(usos: { tipo: TipoVida }[]): number {
  return usos.filter((u) => TIPOS_VIDA[u.tipo].descuentaCupo).length;
}
