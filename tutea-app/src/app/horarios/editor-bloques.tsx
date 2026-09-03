"use client";

import { useState } from "react";
import type { DiaSemana } from "@prisma/client";
import { Plus, X } from "lucide-react";
import {
  DIAS,
  aHHMM,
  aMinutos,
  validarDia,
  type BloqueSimple,
} from "@/lib/horarios";

/**
 * La grilla de días con sus bloques de hora. Vive aparte porque la usan dos
 * pantallas: el editor de horario de la cuadrícula y el alta de un colaborador
 * nuevo, que ya carga su horario en el mismo formulario.
 */

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
export function aBloquesValidos(porDia: PorDia): BloqueSimple[] {
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

/** Primer problema de la semana, o null si está todo bien. */
export function primerError(porDia: PorDia): string | null {
  return (
    DIAS.map((d) =>
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
    ).find(Boolean) ?? null
  );
}

const CLASE_HORA =
  "rounded-lg border border-borde px-2.5 py-1.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

export function EditorBloques({
  bloquesIniciales,
  onCambio,
}: {
  bloquesIniciales: BloqueSimple[];
  /** Se llama en cada edición con lo que ya es válido y el primer error. */
  onCambio: (bloques: BloqueSimple[], error: string | null) => void;
}) {
  const [porDia, setPorDia] = useState<PorDia>(() =>
    aEditable(bloquesIniciales),
  );

  function actualizar(siguiente: PorDia) {
    setPorDia(siguiente);
    onCambio(aBloquesValidos(siguiente), primerError(siguiente));
  }

  function agregar(dia: DiaSemana) {
    const delDia = porDia[dia];
    // El bloque nuevo arranca donde terminó el anterior: el caso habitual es
    // el corte de almuerzo, no un día vacío.
    const ultimo = delDia[delDia.length - 1];
    const inicio = ultimo ? ultimo.fin : BLOQUE_POR_DEFECTO.inicio;
    const inicioMin = aMinutos(inicio);
    const fin =
      inicioMin === null
        ? BLOQUE_POR_DEFECTO.fin
        : aHHMM(Math.min(inicioMin + 240, 1439));
    actualizar({ ...porDia, [dia]: [...delDia, { id: nuevoId(), inicio, fin }] });
  }

  function quitar(dia: DiaSemana, id: string) {
    actualizar({ ...porDia, [dia]: porDia[dia].filter((b) => b.id !== id) });
  }

  function cambiar(
    dia: DiaSemana,
    id: string,
    campo: "inicio" | "fin",
    valor: string,
  ) {
    actualizar({
      ...porDia,
      [dia]: porDia[dia].map((b) => (b.id === id ? { ...b, [campo]: valor } : b)),
    });
  }

  function copiarALaSemana(dia: DiaSemana) {
    const modelo = porDia[dia];
    const copia = { ...porDia };
    for (const d of DIAS) {
      if (d.clave === "sabado") continue; // el sábado casi nunca replica
      copia[d.clave] = modelo.map((b) => ({ ...b, id: nuevoId() }));
    }
    actualizar(copia);
  }

  return (
    <div className="space-y-3">
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
                    className={CLASE_HORA}
                  />
                  <span className="text-sm text-texto-suave">a</span>
                  <input
                    type="time"
                    value={b.fin}
                    onChange={(e) =>
                      cambiar(dia.clave, b.id, "fin", e.target.value)
                    }
                    aria-label={`${dia.etiqueta}: hora de fin`}
                    className={CLASE_HORA}
                  />
                  <button
                    type="button"
                    onClick={() => quitar(dia.clave, b.id)}
                    aria-label={`Quitar el bloque de ${dia.etiqueta}`}
                    className="grid h-7 w-7 place-items-center rounded-lg text-texto-suave hover:bg-peligro-suave hover:text-peligro"
                  >
                    <X aria-hidden size={15} strokeWidth={1.75} />
                  </button>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => agregar(dia.clave)}
                  className="flex items-center gap-1 text-xs font-semibold text-acento hover:underline"
                >
                  <Plus aria-hidden size={14} strokeWidth={2} />
                  Agregar bloque
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
  );
}
