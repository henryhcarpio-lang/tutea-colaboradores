"use client";

import { useState } from "react";
import type { Area, Collaborator } from "@prisma/client";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import { AREAS, LISTA_AREAS } from "@/lib/areas";
import {
  DIAS,
  agruparPorDia,
  duracionLegible,
  rangoLegible,
  totalSemanal,
  type BloqueSimple,
} from "@/lib/horarios";
import { EditorHorario } from "./editor-horario";
import { VistaPorHora } from "./vista-por-hora";

export type FilaHorario = {
  colaborador: Pick<Collaborator, "id" | "nombre" | "foto" | "area">;
  bloques: BloqueSimple[];
};

type Vista = "hora" | "colaborador";

const CLASE_SELECT =
  "rounded-xl border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

const COLUMNAS = "grid-cols-[minmax(180px,1.2fr)_repeat(6,minmax(110px,1fr))]";

function Celda({ bloques }: { bloques: BloqueSimple[] }) {
  if (bloques.length === 0) {
    return <span className="text-xs text-texto-suave/70">—</span>;
  }
  return (
    <div className="space-y-1">
      {bloques.map((b, i) => (
        <div
          key={i}
          className="rounded-lg bg-acento-suave px-2 py-1 text-xs font-medium text-acento"
        >
          {rangoLegible(b.horaInicioMin, b.horaFinMin)}
        </div>
      ))}
    </div>
  );
}

function VistaPorColaborador({
  filas,
  admin,
  onEditar,
}: {
  filas: FilaHorario[];
  admin: boolean;
  onEditar: (colaboradorId: string) => void;
}) {
  return (
    // Ancho mínimo: en pantallas chicas se desplaza dentro de su propia caja,
    // sin arrastrar la página entera.
    <div className="overflow-x-auto rounded-2xl border border-borde bg-superficie">
      <div className="min-w-[840px]">
        <div className={`grid ${COLUMNAS} bg-fondo/60`}>
          <div className="p-3 text-xs font-semibold text-texto-suave">
            Colaborador
          </div>
          {DIAS.map((dia) => (
            <div
              key={dia.clave}
              className="p-3 text-xs font-semibold text-texto-suave"
            >
              {dia.etiqueta}
            </div>
          ))}
        </div>

        {filas.map((fila) => {
          const porDia = agruparPorDia(fila.bloques);
          const total = totalSemanal(fila.bloques);

          return (
            <div
              key={fila.colaborador.id}
              className={`grid ${COLUMNAS} border-t border-borde`}
            >
              <div className="flex items-start gap-3 p-3">
                <Avatar
                  nombre={fila.colaborador.nombre}
                  foto={fila.colaborador.foto}
                  area={fila.colaborador.area}
                  tamano="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {fila.colaborador.nombre}
                  </p>
                  <div className="mt-1">
                    <InsigniaArea area={fila.colaborador.area} />
                  </div>
                  <p className="mt-1 text-xs text-texto-suave">
                    {total > 0
                      ? duracionLegible(total) + " semanales"
                      : "Sin horario"}
                  </p>
                  {admin && (
                    <button
                      type="button"
                      onClick={() => onEditar(fila.colaborador.id)}
                      className="mt-1.5 text-xs font-semibold text-acento hover:underline"
                    >
                      {total > 0 ? "Editar horario" : "Asignar horario"}
                    </button>
                  )}
                </div>
              </div>

              {DIAS.map((dia) => (
                <div key={dia.clave} className="p-3">
                  <Celda bloques={porDia[dia.clave]} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Cuadricula({
  filas,
  admin,
}: {
  filas: FilaHorario[];
  admin: boolean;
}) {
  const [vista, setVista] = useState<Vista>("hora");
  const [area, setArea] = useState<Area | "todas">("todas");
  const [colaboradorId, setColaboradorId] = useState<string>("todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const visibles = filas.filter((f) => {
    if (area !== "todas" && f.colaborador.area !== area) return false;
    if (colaboradorId !== "todos" && f.colaborador.id !== colaboradorId)
      return false;
    return true;
  });

  const enEdicion = filas.find((f) => f.colaborador.id === editandoId);

  if (enEdicion) {
    return (
      <EditorHorario
        colaboradorId={enEdicion.colaborador.id}
        nombre={enEdicion.colaborador.nombre}
        bloquesIniciales={enEdicion.bloques}
        onCerrar={() => setEditandoId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Selector de vista: los mismos datos, dos preguntas distintas. */}
        <div className="flex rounded-xl border border-borde bg-superficie p-0.5">
          {(
            [
              ["hora", "Por hora"],
              ["colaborador", "Por colaborador"],
            ] as const
          ).map(([clave, etiqueta]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setVista(clave)}
              aria-pressed={vista === clave}
              className={`rounded-[10px] px-3 py-1.5 text-sm ${
                vista === clave
                  ? "bg-acento-suave font-semibold text-acento"
                  : "text-texto-suave hover:text-texto"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-texto-suave">
          Área
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as Area | "todas")}
            className={CLASE_SELECT}
          >
            <option value="todas">Todas</option>
            {LISTA_AREAS.map((clave) => (
              <option key={clave} value={clave}>
                {AREAS[clave].etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-texto-suave">
          Colaborador
          <select
            value={colaboradorId}
            onChange={(e) => setColaboradorId(e.target.value)}
            className={CLASE_SELECT}
          >
            <option value="todos">Todos</option>
            {filas.map((f) => (
              <option key={f.colaborador.id} value={f.colaborador.id}>
                {f.colaborador.nombre}
              </option>
            ))}
          </select>
        </label>

        {visibles.length !== filas.length && (
          <button
            type="button"
            onClick={() => {
              setArea("todas");
              setColaboradorId("todos");
            }}
            className="text-sm text-texto-suave hover:text-texto hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio
          titulo="Ningún colaborador coincide con el filtro"
          detalle="Probá con otra área o quitá los filtros para ver a todo el equipo."
        />
      ) : (
        // La página tiene un ancho de lectura cómodo (max-w-6xl), pero seis
        // días con el equipo completo necesitan más lugar del que da esa
        // columna angosta. Esta caja se sale del contenedor y usa todo el
        // ancho de la ventana, así entran más días sin desplazamiento.
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-6 lg:px-10">
          {vista === "hora" ? (
            <VistaPorHora
              filas={visibles}
              admin={admin}
              onEditar={setEditandoId}
            />
          ) : (
            <VistaPorColaborador
              filas={visibles}
              admin={admin}
              onEditar={setEditandoId}
            />
          )}
        </div>
      )}
    </div>
  );
}
