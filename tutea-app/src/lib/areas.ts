import type { Area } from "@prisma/client";

// Los colores salen del brandbook: azul principal, verde secundario y azul
// marino secundario. Se definen una sola vez acá porque el área etiqueta al
// colaborador en los cuatro módulos.
export const AREAS: Record<
  Area,
  { etiqueta: string; texto: string; fondo: string }
> = {
  operativo: {
    etiqueta: "Operativo",
    texto: "text-[var(--area-operativo)]",
    fondo: "bg-[var(--area-operativo-suave)]",
  },
  comercial: {
    etiqueta: "Comercial",
    texto: "text-[var(--area-comercial)]",
    fondo: "bg-[var(--area-comercial-suave)]",
  },
  administrativo: {
    etiqueta: "Administrativo",
    texto: "text-[var(--area-administrativo)]",
    fondo: "bg-[var(--area-administrativo-suave)]",
  },
};

export const LISTA_AREAS = Object.keys(AREAS) as Area[];
