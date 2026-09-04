import type { TipoVida } from "@prisma/client";

/**
 * Motivo de un permiso, para pintar el corazón distinto según la razón:
 * celeste con curita para descanso médico, verde para desastre natural. El
 * resto de los motivos (trámites, familiares, etc.) queda como "general".
 */
export const TIPOS_VIDA: Record<
  TipoVida,
  { etiqueta: string; color: string }
> = {
  general: { etiqueta: "General", color: "#d4d8e0" },
  medico: { etiqueta: "Descanso médico", color: "#38bdf8" },
  desastre: { etiqueta: "Desastre natural", color: "#22c55e" },
};

export const LISTA_TIPOS_VIDA = Object.keys(TIPOS_VIDA) as TipoVida[];
