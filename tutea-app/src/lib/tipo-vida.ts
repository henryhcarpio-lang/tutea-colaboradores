import type { TipoVida } from "@prisma/client";

/**
 * Motivo de un permiso, para pintar el corazón distinto según la razón:
 * celeste con curita para descanso médico, verde para desastre natural,
 * ámbar para un permiso recuperable (se repone trabajando otro día, no es un
 * día perdido) y violeta con reloj para omitir una tardanza. El resto de los
 * motivos (trámites, familiares, etc.) queda como "general".
 */
export const TIPOS_VIDA: Record<
  TipoVida,
  { etiqueta: string; color: string }
> = {
  general: { etiqueta: "General", color: "#d4d8e0" },
  medico: { etiqueta: "Descanso médico", color: "#38bdf8" },
  desastre: { etiqueta: "Desastre natural", color: "#22c55e" },
  recuperable: { etiqueta: "Permiso recuperable", color: "#f59e0b" },
  tardanza: { etiqueta: "Omitir tardanza", color: "#8b5cf6" },
};

export const LISTA_TIPOS_VIDA = Object.keys(TIPOS_VIDA) as TipoVida[];
