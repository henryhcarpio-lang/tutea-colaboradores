import type { Area } from "@prisma/client";
import { AREAS } from "@/lib/areas";

export function InsigniaArea({ area }: { area: Area }) {
  const { etiqueta, texto, fondo } = AREAS[area];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${fondo} ${texto}`}
    >
      {etiqueta}
    </span>
  );
}
