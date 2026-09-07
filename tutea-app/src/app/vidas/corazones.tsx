"use client";

import type { TipoVida } from "@prisma/client";
import { Bandage } from "lucide-react";
import { TIPOS_VIDA } from "@/lib/tipo-vida";

const TRAZO =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** Un corazón gastado, coloreado según por qué se usó. */
function CorazonUsado({
  tipo,
  excedida,
  animar,
}: {
  tipo: TipoVida;
  excedida: boolean;
  animar: boolean;
}) {
  const color = excedida && tipo === "general" ? "#7f1d1d" : TIPOS_VIDA[tipo].color;
  const titulo = `Vida usada · ${TIPOS_VIDA[tipo].etiqueta}${excedida ? " (excedida)" : ""}`;

  return (
    <span className={`relative inline-flex ${animar ? "romperse" : ""}`}>
      <svg viewBox="0 0 24 24" role="img" aria-label={titulo} className="h-6 w-6 shrink-0">
        <title>{titulo}</title>
        {/* Sin borde: el color de relleno y la etiqueta "N de más" ya avisan
            que se excedió el cupo, sin necesitar un aro alrededor. */}
        <path d={TRAZO} fill={color} />
        {/* La grieta: una línea en zigzag del color del fondo parte el
            corazón al medio, para que se lea como "gastado" sea cual sea
            el color que tenga encima. */}
        <polyline
          points="12,4 9.6,10 13.4,13 10.6,21"
          fill="none"
          stroke="var(--superficie)"
          strokeWidth="1.9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {tipo === "medico" && (
        <Bandage
          aria-hidden
          size={9}
          strokeWidth={2.5}
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-superficie p-[1px] text-[#0369a1]"
        />
      )}
    </span>
  );
}

function CorazonDisponible() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Vida disponible" className="h-6 w-6 shrink-0">
      <title>Vida disponible</title>
      <path d={TRAZO} className="fill-[#e11d48]" />
    </svg>
  );
}

export type UsoCorazon = { tipo: TipoVida };

/**
 * Fila de corazones al estilo de un videojuego: llenos los disponibles, rotos
 * y coloreados por motivo los gastados. Si se usaron más vidas que el cupo,
 * los excedentes se agregan al final con un aro rojo, en vez de bloquear el
 * registro.
 */
export function Corazones({
  asignadas,
  usos,
  indiceAnimado,
}: {
  asignadas: number;
  usos: UsoCorazon[];
  /** Índice del corazón que se acaba de gastar; se anima solo ese. */
  indiceAnimado: number | null;
}) {
  const usadas = usos.length;
  const disponibles = Math.max(0, asignadas - usadas);

  if (asignadas === 0 && usadas === 0) {
    return <span className="text-sm text-texto-suave">Sin cupo este mes</span>;
  }

  const excedidas = usos.filter((_, i) => i >= asignadas).length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {usos.map((uso, i) => (
        <CorazonUsado
          key={i}
          tipo={uso.tipo}
          excedida={i >= asignadas}
          animar={indiceAnimado === i}
        />
      ))}
      {Array.from({ length: disponibles }, (_, i) => (
        <CorazonDisponible key={`d${i}`} />
      ))}
      {excedidas > 0 && (
        <span className="ml-1 text-xs font-semibold text-peligro">
          {excedidas} de más
        </span>
      )}
    </div>
  );
}
