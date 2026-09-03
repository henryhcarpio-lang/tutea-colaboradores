import type { Area } from "@prisma/client";
import { AREAS } from "@/lib/areas";

const TAMANOS = {
  xs: { caja: "h-6 w-6", texto: "text-[9px]" },
  sm: { caja: "h-8 w-8", texto: "text-[11px]" },
  md: { caja: "h-11 w-11", texto: "text-sm" },
  lg: { caja: "h-20 w-20", texto: "text-xl" },
  xl: { caja: "h-32 w-32", texto: "text-4xl" },
} as const;

export type TamanoAvatar = keyof typeof TAMANOS;

/** Iniciales a partir del nombre: "Ana María Paz" → "AP". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + ultima).toUpperCase();
}

/**
 * Ícono redondo del colaborador. Es el elemento visual que el spec pide
 * reutilizar en horarios, vidas y cumpleaños, así que vive en un solo lugar.
 * Sin foto cargada, cae en las iniciales sobre el color de su área.
 */
export function Avatar({
  nombre,
  foto,
  area,
  tamano = "md",
}: {
  nombre: string;
  foto: string | null;
  area: Area;
  tamano?: TamanoAvatar;
}) {
  const { caja, texto } = TAMANOS[tamano];
  const colores = AREAS[area];

  if (foto) {
    return (
      // La foto es un data URL base64 en la propia base: <img> directo, sin
      // next/image, que solo optimiza rutas y URLs remotas.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nombre}
        className={`${caja} shrink-0 rounded-full border border-borde object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${caja} ${texto} ${colores.fondo} ${colores.texto} grid shrink-0 place-items-center rounded-full border border-borde font-semibold`}
    >
      {iniciales(nombre)}
    </span>
  );
}
