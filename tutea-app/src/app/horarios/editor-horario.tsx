"use client";

import { useActionState, useEffect, useState } from "react";
import { duracionLegible, totalSemanal, type BloqueSimple } from "@/lib/horarios";
import { EditorBloques } from "./editor-bloques";
import { guardarHorario, type EstadoHorario } from "./acciones";

const ESTADO_INICIAL: EstadoHorario = {};

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
  const [bloques, setBloques] = useState<BloqueSimple[]>(bloquesIniciales);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  const total = totalSemanal(bloques);

  return (
    <form
      action={accion}
      className="aparecer rounded-2xl border border-borde bg-superficie p-6"
    >
      <input type="hidden" name="colaboradorId" value={colaboradorId} />
      <input type="hidden" name="bloques" value={JSON.stringify(bloques)} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Horario de {nombre}
        </h2>
        <p className="text-sm text-texto-suave">
          {total > 0 ? `${duracionLegible(total)} por semana` : "Sin horario"}
        </p>
      </div>

      <div className="mt-6">
        <EditorBloques
          bloquesIniciales={bloquesIniciales}
          onCambio={(nuevos, error) => {
            setBloques(nuevos);
            setErrorLocal(error);
          }}
        />
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
