"use client";

import type { TipoVida } from "@prisma/client";
import { Bandage, Clock } from "lucide-react";
import { GRIS_NEUTRO, TIPOS_VIDA } from "@/lib/tipo-vida";

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
  // Un corazón de más se pinta rojo oscuro solo si su motivo es de los
  // neutros (gris): médico y desastre conservan su color, que dice algo que
  // el "N de más" de al lado no dice. Además médico y desastre nunca llegan
  // acá con excedida=true: no descuentan cupo, así que nunca lo pasan.
  const propio = TIPOS_VIDA[tipo].color;
  const color = excedida && propio === GRIS_NEUTRO ? "#7f1d1d" : propio;
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
      {tipo === "tardanza" && (
        <Clock
          aria-hidden
          size={9}
          strokeWidth={2.5}
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-superficie p-[1px] text-[#6d28d9]"
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

export type UsoCorazon = { id: string; tipo: TipoVida };

/**
 * Fila de corazones al estilo de un videojuego: llenos los disponibles, rotos
 * y coloreados por motivo los gastados. Descanso médico y desastre natural no
 * descuentan del cupo —se registran igual, para que gerencia tenga el dato,
 * pero no le cuestan una vida a la persona— así que se dibujan aparte, al
 * final de la fila, y nunca cuentan para el "N de más". Si se usaron más
 * vidas del cupo entre los motivos que sí descuentan, los excedentes se
 * agregan en rojo oscuro, en vez de bloquear el registro.
 */
export function Corazones({
  asignadas,
  usos,
  idAnimado,
}: {
  asignadas: number;
  usos: UsoCorazon[];
  /** Id del uso recién gastado; se anima solo ese corazón. */
  idAnimado: string | null;
}) {
  const dentroDelCupo = usos.filter((u) => TIPOS_VIDA[u.tipo].descuentaCupo);
  const fueraDelCupo = usos.filter((u) => !TIPOS_VIDA[u.tipo].descuentaCupo);
  const usadas = dentroDelCupo.length;
  const disponibles = Math.max(0, asignadas - usadas);

  if (asignadas === 0 && usadas === 0 && fueraDelCupo.length === 0) {
    return <span className="text-sm text-texto-suave">Sin cupo este mes</span>;
  }

  const excedidas = dentroDelCupo.filter((_, i) => i >= asignadas).length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {dentroDelCupo.map((uso, i) => (
        <CorazonUsado
          key={uso.id}
          tipo={uso.tipo}
          excedida={i >= asignadas}
          animar={idAnimado === uso.id}
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
      {fueraDelCupo.map((uso) => (
        <CorazonUsado
          key={uso.id}
          tipo={uso.tipo}
          excedida={false}
          animar={idAnimado === uso.id}
        />
      ))}
      {fueraDelCupo.length > 0 && (
        <span className="ml-1 text-xs text-texto-suave">
          {fueraDelCupo.length} sin descontar
        </span>
      )}
    </div>
  );
}
