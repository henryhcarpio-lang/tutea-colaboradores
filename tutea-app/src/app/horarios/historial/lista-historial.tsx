"use client";

import { useState } from "react";
import type { Collaborator, DiaSemana } from "@prisma/client";
import { Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import { DIAS, duracionLegible, rangoLegible } from "@/lib/horarios";
import {
  diasCambiados,
  porDia,
  resumirDias,
  totalMinutos,
  type BloqueSnapshot,
} from "@/lib/historial";

export type Cambio = {
  id: string;
  fechaCambio: string;
  anterior: BloqueSnapshot[];
  nuevo: BloqueSnapshot[];
};

export type HistorialColaborador = {
  colaborador: Pick<Collaborator, "id" | "nombre" | "foto" | "area">;
  cambios: Cambio[];
};

const CLASE_SELECT =
  "rounded-xl border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
}

/** Una columna de días con sus bloques; se usa dos veces, antes y después. */
function Columna({
  titulo,
  snapshot,
  cambiados,
  tono,
}: {
  titulo: string;
  snapshot: BloqueSnapshot[];
  cambiados: DiaSemana[];
  tono: "anterior" | "nuevo";
}) {
  const total = totalMinutos(snapshot);
  const esNuevo = tono === "nuevo";

  return (
    <div className="flex-1">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            esNuevo ? "text-exito" : "text-texto-suave"
          }`}
        >
          {titulo}
        </p>
        <p className="text-xs text-texto-suave">
          {total > 0 ? duracionLegible(total) : "sin horario"}
        </p>
      </div>

      <ul className="space-y-1">
        {DIAS.map((dia) => {
          const bloques = porDia(snapshot, dia.clave);
          const cambio = cambiados.includes(dia.clave);
          return (
            <li
              key={dia.clave}
              className={`flex items-start gap-2 rounded-lg px-2 py-1 text-xs ${
                cambio
                  ? esNuevo
                    ? "bg-exito-suave"
                    : "bg-peligro-suave"
                  : "opacity-60"
              }`}
            >
              <span className="w-20 shrink-0 font-medium">{dia.etiqueta}</span>
              <span className="flex-1 tabular-nums">
                {bloques.length === 0
                  ? "—"
                  : bloques
                      .map((b) => rangoLegible(b.inicio, b.fin))
                      .join(" · ")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EntradaCambio({ cambio }: { cambio: Cambio }) {
  const cambiados = diasCambiados(cambio.anterior, cambio.nuevo);
  const esPrimero = cambio.anterior.length === 0;

  return (
    <li className="rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{fechaLegible(cambio.fechaCambio)}</p>
        <p className="text-xs text-texto-suave">
          {esPrimero
            ? "Primera asignación de horario"
            : `Cambió ${resumirDias(cambiados)}`}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:gap-8">
        <Columna
          titulo="Antes"
          snapshot={cambio.anterior}
          cambiados={cambiados}
          tono="anterior"
        />
        <Columna
          titulo="Después"
          snapshot={cambio.nuevo}
          cambiados={cambiados}
          tono="nuevo"
        />
      </div>
    </li>
  );
}

export function ListaHistorial({
  historiales,
}: {
  historiales: HistorialColaborador[];
}) {
  const [colaboradorId, setColaboradorId] = useState<string>(
    historiales[0]?.colaborador.id ?? "",
  );
  const [busqueda, setBusqueda] = useState("");

  // Se ignoran mayúsculas y tildes: escribir "ordonez" tiene que encontrar a
  // "Ordóñez", que es como se escribe pero no como se teclea con apuro.
  const normalizar = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

  const termino = normalizar(busqueda.trim());
  const coinciden = termino
    ? historiales.filter((h) => normalizar(h.colaborador.nombre).includes(termino))
    : historiales;

  // Si lo que está elegido no está entre los resultados, se pasa al primero:
  // así escribir un nombre alcanza para verlo, sin tocar el desplegable.
  const elegido =
    coinciden.find((h) => h.colaborador.id === colaboradorId) ?? coinciden[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            aria-hidden
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar colaborador por nombre"
            className="w-56 rounded-xl border border-borde bg-superficie py-2 pl-9 pr-3 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15"
          />
        </div>

        {coinciden.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Nadie coincide con “{busqueda.trim()}”.
          </p>
        ) : (
          <label className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
            Colaborador
            <select
              value={elegido?.colaborador.id ?? ""}
              onChange={(e) => setColaboradorId(e.target.value)}
              className={CLASE_SELECT}
            >
              {coinciden.map((h) => (
                <option key={h.colaborador.id} value={h.colaborador.id}>
                  {h.colaborador.nombre}
                  {h.cambios.length > 0 ? ` (${h.cambios.length})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {elegido && (
        <>
          <div className="flex items-center gap-3">
            <Avatar
              nombre={elegido.colaborador.nombre}
              foto={elegido.colaborador.foto}
              area={elegido.colaborador.area}
              tamano="md"
            />
            <div>
              <p className="font-semibold">{elegido.colaborador.nombre}</p>
              <div className="mt-0.5">
                <InsigniaArea area={elegido.colaborador.area} />
              </div>
            </div>
          </div>

          {elegido.cambios.length === 0 ? (
            <EstadoVacio
              titulo="Sin cambios registrados"
              detalle="En cuanto se guarde un horario para esta persona, cada modificación va a quedar acá con su fecha."
            />
          ) : (
            // Del más reciente al más antiguo: lo último que pasó es lo que
            // gerencia suele venir a mirar.
            <ul className="space-y-3">
              {elegido.cambios.map((cambio) => (
                <EntradaCambio key={cambio.id} cambio={cambio} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
