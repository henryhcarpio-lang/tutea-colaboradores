import type { EstadoEvento } from "@prisma/client";

/**
 * Estado de un evento del calendario, y el color que define en la vista
 * mensual. En desarrollo y finalizado reusan el azul y el verde de marca
 * (mismo significado que en el resto del sistema); pendiente es un ámbar
 * nuevo, porque ningún tono de marca transmitía "todavía no arrancó".
 */
export const ESTADOS_EVENTO: Record<
  EstadoEvento,
  { etiqueta: string; texto: string; fondo: string; punto: string }
> = {
  pendiente: {
    etiqueta: "Pendiente",
    texto: "text-[var(--evento-pendiente)]",
    fondo: "bg-[var(--evento-pendiente-suave)]",
    punto: "var(--evento-pendiente)",
  },
  en_desarrollo: {
    etiqueta: "En desarrollo",
    texto: "text-acento",
    fondo: "bg-acento-suave",
    punto: "var(--acento)",
  },
  finalizado: {
    etiqueta: "Finalizado",
    texto: "text-exito",
    fondo: "bg-exito-suave",
    punto: "var(--exito)",
  },
};

export const LISTA_ESTADOS_EVENTO = Object.keys(ESTADOS_EVENTO) as EstadoEvento[];
