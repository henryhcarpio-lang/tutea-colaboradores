"use client";

import { useActionState, useEffect, useState } from "react";
import type { DiaSemana } from "@prisma/client";
import {
  DIAS,
  aHHMM,
  aMinutos,
  duracionLegible,
  totalSemanal,
  validarDia,
  type BloqueSimple,
} from "@/lib/horarios";
import { guardarHorario, type EstadoHorario } from "./acciones";

const ESTADO_INICIAL: EstadoHorario = {};

/** Bloque en edición: las horas viven como texto mientras se escriben. */
type BloqueEditable = { id: string; inicio: string; fin: string };

type PorDia = Record<DiaSemana, BloqueEditable[]>;

// Jornada típica de Tutea, para que agregar un bloque no arranque vacío.
const BLOQUE_POR_DEFECTO = { inicio: "09:00", fin: "13:00" };

let contador = 0;
const nuevoId = () => `b${contador++}`;

function aEditable(bloques: BloqueSimple[]): PorDia {
  const porDia = Object.fromEntries(
    DIAS.map((d) => [d.clave, [] as BloqueEditable[]]),
  ) as PorDia;

  for (const b of bloques) {
    porDia[b.diaSemana].push({
      id: nuevoId(),
      inicio: aHHMM(b.horaInicioMin),
      fin: aHHMM(b.horaFinMin),
    });
  }
  for (const d of DIAS) {
    porDia[d.clave].sort((a, b) => a.inicio.localeCompare(b.inicio));
  }
  return porDia;
}

/** Convierte a minutos lo que ya sea válido; ignora lo que está a medio escribir. */
function aBloquesValidos(porDia: PorDia): BloqueSimple[] {
  const salida: BloqueSimple[] = [];
  for (const dia of DIAS) {
    for (const b of porDia[dia.clave]) {
      const inicio = aMinutos(b.inicio);
      const fin = aMinutos(b.fin);
      if (inicio === null || fin === null) continue;
      salida.push({
        diaSemana: dia.clave,
        horaInicioMin: inicio,
        horaFinMin: fin,
      });
    }
  }
  return salida;
}

export function EditorHorario({
  colaboradorId,
  nombre,
  bloquesIniciales,
  onCerrar,
}: {
  colaboradorId: string;
  nombre: string;
  bloquesIniciales: BloqueSimple[];
  onCerrar: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(
    guardarHorario,
    ESTADO_INICIAL,
  );
  const [porDia, setPorDia] = useState<PorDia>(() =>
    aEditable(bloquesIniciales),
  );

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  function agregar(dia: DiaSemana) {
    setPorDia((prev) => {
      const delDia = prev[dia];
      // El bloque nuevo arranca donde terminó el anterior: el caso habitual es
      // el corte de almuerzo, no un día vacío.
      const ultimo = delDia[delDia.length - 1];
      const inicio = ultimo ? ultimo.fin : BLOQUE_POR_DEFECTO.inicio;
      const finMin = aMinutos(inicio);
      const fin =
        finMin === null ? BLOQUE_POR_DEFECTO.fin : aHHMM(Math.min(finMin + 240, 1439));
      return { ...prev, [dia]: [...delDia, { id: nuevoId(), inicio, fin }] };
    });
  }

  function quitar(dia: DiaSemana, id: string) {
    setPorDia((prev) => ({
      ...prev,
      [dia]: prev[dia].filter((b) => b.id !== id),
    }));
  }

  function cambiar(
    dia: DiaSemana,
    id: string,
    campo: "inicio" | "fin",
    valor: string,
  ) {
    setPorDia((prev) => ({
      ...prev,
      [dia]: prev[dia].map((b) => (b.id === id ? { ...b, [campo]: valor } : b)),
    }));
  }

  function copiarALaSemana(dia: DiaSemana) {
    setPorDia((prev) => {
      const modelo = prev[dia];
      const copia = { ...prev };
      for (const d of DIAS) {
        if (d.clave === "sabado") continue; // el sábado casi nunca replica
        copia[d.clave] = modelo.map((b) => ({ ...b, id: nuevoId() }));
      }
      return copia;
    });
  }

  const bloquesValidos = aBloquesValidos(porDia);
  const total = totalSemanal(bloquesValidos);

  // Aviso en vivo, antes de que el servidor rechace.
  const errorLocal = DIAS.map((d) =>
    validarDia(
      porDia[d.clave]
        .map((b) => ({
          horaInicioMin: aMinutos(b.inicio),
          horaFinMin: aMinutos(b.fin),
        }))
        .filter(
          (b): b is { horaInicioMin: number; horaFinMin: number } =>
            b.horaInicioMin !== null && b.horaFinMin !== null,
        ),
      d.etiqueta,
    ),
  ).find(Boolean);

  return (
    <form
      action={accion}
      className="aparecer rounded-2xl border border-borde bg-superficie p-6"
    >
      <input type="hidden" name="colaboradorId" value={colaboradorId} />
      <input
        type="hidden"
        name="bloques"
        value={JSON.stringify(bloquesValidos)}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Horario de {nombre}
        </h2>
        <p className="text-sm text-texto-suave">
          {total > 0 ? `${duracionLegible(total)} por semana` : "Sin horario"}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {DIAS.map((dia) => {
          const delDia = porDia[dia.clave];
          return (
            <div
              key={dia.clave}
              className="rounded-xl border border-borde/70 p-3 sm:flex sm:gap-4"
            >
              <div className="flex items-center justify-between sm:w-32 sm:shrink-0 sm:justify-start">
                <span className="text-sm font-semibold">{dia.etiqueta}</span>
                {delDia.length > 1 && (
                  <span className="text-xs text-texto-suave sm:hidden">
                    {delDia.length} bloques
                  </span>
                )}
              </div>

              <div className="mt-2 flex-1 space-y-2 sm:mt-0">
                {delDia.length === 0 && (
                  <p className="text-sm text-texto-suave">No trabaja</p>
                )}

                {delDia.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={b.inicio}
                      onChange={(e) =>
                        cambiar(dia.clave, b.id, "inicio", e.target.value)
                      }
                      aria-label={`${dia.etiqueta}: hora de inicio`}
                      className="rounded-lg border border-borde px-2.5 py-1.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15"
                    />
                    <span className="text-sm text-texto-suave">a</span>
                    <input
                      type="time"
                      value={b.fin}
                      onChange={(e) =>
                        cambiar(dia.clave, b.id, "fin", e.target.value)
                      }
                      aria-label={`${dia.etiqueta}: hora de fin`}
                      className="rounded-lg border border-borde px-2.5 py-1.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15"
                    />
                    <button
                      type="button"
                      onClick={() => quitar(dia.clave, b.id)}
                      className="rounded-lg px-2 py-1 text-xs text-texto-suave hover:bg-peligro-suave hover:text-peligro"
                    >
                      Quitar
                    </button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => agregar(dia.clave)}
                    className="text-xs font-semibold text-acento hover:underline"
                  >
                    + Agregar bloque
                  </button>
                  {delDia.length > 0 && (
                    <button
                      type="button"
                      onClick={() => copiarALaSemana(dia.clave)}
                      className="text-xs text-texto-suave hover:text-texto hover:underline"
                    >
                      Copiar de lunes a viernes
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(errorLocal || estado.error) && (
        <p role="alert" className="mt-5 text-sm text-peligro">
          {errorLocal ?? estado.error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente || Boolean(errorLocal)}
          className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Guardar horario"}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-xl px-3 py-2.5 text-sm text-texto-suave hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
