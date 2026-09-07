"use client";

import { useState } from "react";
import Link from "next/link";
import type { EstadoEvento } from "@prisma/client";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DIAS_SEMANA, aFechaISO } from "@/lib/calendario";
import { ESTADOS_EVENTO } from "@/lib/estado-evento";
import { FormularioEvento } from "./formulario-evento";
import { DetalleEvento } from "./detalle-evento";

export type Celda = {
  fecha: string;
  dia: number;
  delMesActual: boolean;
  esHoy: boolean;
};

export type Evento = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  estado: EstadoEvento;
};

/** Cuántos eventos se listan antes de resumir el resto en "+N más". */
const MAX_VISIBLES = 3;

type Panel =
  | { modo: "crear"; fecha: string }
  | { modo: "editar"; evento: Evento }
  | { modo: "ver"; evento: Evento }
  | null;

export function CalendarioMensual({
  etiqueta,
  semanas,
  eventos,
  hrefAnterior,
  hrefSiguiente,
  hrefHoy,
  hoy,
  admin,
}: {
  etiqueta: string;
  semanas: Celda[][];
  eventos: Evento[];
  hrefAnterior: string;
  hrefSiguiente: string;
  hrefHoy: string;
  /** Hoy en Lima, YYYY-MM-DD: valor por defecto al crear desde el botón de arriba. */
  hoy: string;
  admin: boolean;
}) {
  const [panel, setPanel] = useState<Panel>(null);

  const eventosPorDia = new Map<string, Evento[]>();
  for (const ev of eventos) {
    const clave = aFechaISO(ev.fecha);
    const lista = eventosPorDia.get(clave) ?? [];
    lista.push(ev);
    eventosPorDia.set(clave, lista);
  }

  function abrirEvento(ev: Evento) {
    setPanel(admin ? { modo: "editar", evento: ev } : { modo: "ver", evento: ev });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={hrefAnterior}
            aria-label="Mes anterior"
            className="grid h-8 w-8 place-items-center rounded-lg border border-borde hover:bg-fondo"
          >
            <ChevronLeft aria-hidden size={16} strokeWidth={1.75} />
          </Link>
          <span className="min-w-40 text-center text-sm font-semibold">
            {etiqueta}
          </span>
          <Link
            href={hrefSiguiente}
            aria-label="Mes siguiente"
            className="grid h-8 w-8 place-items-center rounded-lg border border-borde hover:bg-fondo"
          >
            <ChevronRight aria-hidden size={16} strokeWidth={1.75} />
          </Link>
          <Link
            href={hrefHoy}
            className="ml-2 text-sm text-texto-suave hover:text-texto hover:underline"
          >
            Hoy
          </Link>
        </div>

        {admin && (
          <button
            type="button"
            onClick={() => setPanel({ modo: "crear", fecha: hoy })}
            className="flex items-center gap-2 rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte"
          >
            <Plus aria-hidden size={17} strokeWidth={1.75} />
            Nuevo evento
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-borde bg-superficie">
        <div className="grid grid-cols-7 border-b border-borde bg-fondo/60">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="p-2 text-center text-xs font-semibold uppercase tracking-wide text-texto-suave"
            >
              {d}
            </div>
          ))}
        </div>

        {semanas.map((fila, i) => (
          <div
            key={i}
            className="grid grid-cols-7 border-b border-borde last:border-b-0"
          >
            {fila.map((celda) => {
              const eventosDia = eventosPorDia.get(aFechaISO(celda.fecha)) ?? [];
              const visibles = eventosDia.slice(0, MAX_VISIBLES);
              const restantes = eventosDia.length - visibles.length;

              return (
                <div
                  key={celda.fecha}
                  className={`group min-h-24 border-r border-borde p-1.5 last:border-r-0 sm:min-h-28 ${
                    celda.delMesActual ? "" : "bg-fondo/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        celda.esHoy
                          ? "bg-acento text-white"
                          : celda.delMesActual
                            ? "text-texto"
                            : "text-texto-suave/50"
                      }`}
                    >
                      {celda.dia}
                    </span>
                    {admin && (
                      <button
                        type="button"
                        onClick={() =>
                          setPanel({ modo: "crear", fecha: aFechaISO(celda.fecha) })
                        }
                        title="Agregar un evento este día"
                        className="grid h-5 w-5 place-items-center rounded text-texto-suave opacity-0 hover:bg-fondo hover:text-acento focus:opacity-100 group-hover:opacity-100"
                      >
                        <Plus aria-hidden size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {visibles.map((ev) => {
                      const colores = ESTADOS_EVENTO[ev.estado];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => abrirEvento(ev)}
                          title={ev.titulo}
                          className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${colores.fondo} ${colores.texto}`}
                        >
                          {ev.titulo}
                        </button>
                      );
                    })}
                    {restantes > 0 && (
                      <p className="px-1.5 text-[11px] text-texto-suave">
                        +{restantes} más
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {panel?.modo === "crear" && (
        <FormularioEvento fechaPorDefecto={panel.fecha} onCerrar={() => setPanel(null)} />
      )}
      {panel?.modo === "editar" && (
        <FormularioEvento
          evento={panel.evento}
          fechaPorDefecto={aFechaISO(panel.evento.fecha)}
          onCerrar={() => setPanel(null)}
        />
      )}
      {panel?.modo === "ver" && (
        <DetalleEvento evento={panel.evento} onCerrar={() => setPanel(null)} />
      )}
    </div>
  );
}
