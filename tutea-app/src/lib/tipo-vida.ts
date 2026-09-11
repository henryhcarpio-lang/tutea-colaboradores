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
 */
export const TIPOS_VIDA: Record<
  TipoVida,
  { etiqueta: string; color: string }
> = {
  // `general` ya no se puede elegir (no está en LISTA_TIPOS_VIDA), pero sigue
  // aquí para que los permisos viejos registrados con ese motivo se sigan
  // mostrando bien en el historial: un dato ya guardado no se reescribe.
  general: { etiqueta: "General", color: GRIS },
  medico: { etiqueta: "Descanso médico", color: "#38bdf8" },
  desastre: { etiqueta: "Desastre natural", color: "#22c55e" },
  recuperable: { etiqueta: "Permiso recuperable", color: GRIS },
  tardanza: { etiqueta: "Omitir tardanza", color: GRIS },
};

/** Los que se pueden elegir hoy al registrar un permiso. */
export const LISTA_TIPOS_VIDA: TipoVida[] = [
  "recuperable",
  "tardanza",
  "medico",
  "desastre",
];
