"use client";

import { X } from "lucide-react";
import { ESTADOS_EVENTO } from "@/lib/estado-evento";
import type { Evento } from "./calendario-mensual";

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Vista de solo lectura para quien mira sin sesión de admin. */
export function DetalleEvento({
  evento,
  onCerrar,
}: {
  evento: Evento;
  onCerrar: () => void;
}) {
  const colores = ESTADOS_EVENTO[evento.estado];

  return (
    <div className="aparecer mt-4 rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{evento.titulo}</h3>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-texto-suave hover:text-texto"
        >
          <X aria-hidden size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colores.fondo} ${colores.texto}`}
        >
          {colores.etiqueta}
        </span>
        <span className="text-xs text-texto-suave">
          {fechaLegible(evento.fecha)}
        </span>
      </div>

      {evento.descripcion && (
        <p className="mt-3 text-sm leading-relaxed text-texto-suave">
          {evento.descripcion}
        </p>
      )}
    </div>
  );
}
