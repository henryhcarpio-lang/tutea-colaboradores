"use client";

import { AREAS } from "@/lib/areas";
import { Avatar } from "@/components/avatar";
import { EstadoVacio } from "@/components/seccion";
import { DIAS, aHoraLocal, rangoLegible } from "@/lib/horarios";
import type { FilaHorario } from "./cuadricula";

/**
 * Línea de tiempo: las horas bajan por el costado y cada persona es una barra
 * continua que abarca su bloque, en su propia columna dentro del día. Responde
 * "¿quién está el martes a las 10?" de un vistazo, y deja ver el solapamiento
 * entre turnos sin repetir el nombre fila por fila.
 */

// Granularidad de 5 minutos: permite que una entrada a las 8:50 caiga en su
// lugar exacto, sin redondear.
const MINUTOS_POR_RANURA = 5;
const ALTO_RANURA = 5; // px
const MINUTOS_ENTRE_ETIQUETAS = 30;
const RANURAS_ENTRE_ETIQUETAS = MINUTOS_ENTRE_ETIQUETAS / MINUTOS_POR_RANURA;

type Tramo = { desde: number; hasta: number };

/**
 * Parte la jornada en tramos separados por los huecos en que no trabaja nadie.
 * Es lo que separa mañana y tarde sin tener que fijar la hora del almuerzo:
 * sale de los datos.
 */
function calcularTramos(filas: FilaHorario[]): Tramo[] {
  const bloques = filas.flatMap((f) => f.bloques);
  if (bloques.length === 0) return [];

  const inicio = Math.min(...bloques.map((b) => b.horaInicioMin));
  const fin = Math.max(...bloques.map((b) => b.horaFinMin));

  const tramos: Tramo[] = [];
  let abierto: number | null = null;

  for (let m = inicio; m < fin; m += MINUTOS_POR_RANURA) {
    const hayGente = bloques.some(
      (b) => b.horaInicioMin <= m && b.horaFinMin > m,
    );
    if (hayGente && abierto === null) abierto = m;
    if (!hayGente && abierto !== null) {
      tramos.push({ desde: abierto, hasta: m });
      abierto = null;
    }
  }
  if (abierto !== null) tramos.push({ desde: abierto, hasta: fin });

  // Un hueco de menos de media hora no justifica cortar la grilla en dos.
  const unidos: Tramo[] = [];
  for (const tramo of tramos) {
    const previo = unidos[unidos.length - 1];
    if (previo && tramo.desde - previo.hasta < MINUTOS_ENTRE_ETIQUETAS) {
      previo.hasta = tramo.hasta;
    } else {
      unidos.push({ ...tramo });
    }
  }
  return unidos;
}

/** Redondea el inicio del tramo hacia abajo a la etiqueta anterior. */
function alineado(minutos: number): number {
  return Math.floor(minutos / MINUTOS_ENTRE_ETIQUETAS) * MINUTOS_ENTRE_ETIQUETAS;
}

function ColumnaDia({
  filas,
  dia,
  tramo,
  admin,
  onEditar,
}: {
  filas: FilaHorario[];
  dia: (typeof DIAS)[number];
  tramo: Tramo;
  admin: boolean;
  onEditar: (colaboradorId: string) => void;
}) {
  const desde = alineado(tramo.desde);
  const ranuras = Math.ceil((tramo.hasta - desde) / MINUTOS_POR_RANURA);

  // Solo ocupan columna quienes trabajan ese día dentro de este tramo.
  const presentes = filas.filter((f) =>
    f.bloques.some(
      (b) =>
        b.diaSemana === dia.clave &&
        b.horaInicioMin < tramo.hasta &&
        b.horaFinMin > tramo.desde,
    ),
  );

  if (presentes.length === 0) {
    return (
      <div className="grid place-items-start justify-center border-l border-borde pt-2">
        <span className="text-xs text-texto-suave/50">—</span>
      </div>
    );
  }

  return (
    <div
      className="grid gap-x-1 border-l border-borde px-1"
      style={{
        gridTemplateColumns: `repeat(${presentes.length}, minmax(34px, 1fr))`,
        gridTemplateRows: `repeat(${ranuras}, ${ALTO_RANURA}px)`,
      }}
    >
      {presentes.map((f, columna) =>
        f.bloques
          .filter(
            (b) =>
              b.diaSemana === dia.clave &&
              b.horaInicioMin < tramo.hasta &&
              b.horaFinMin > tramo.desde,
          )
          .map((b, i) => {
            const filaInicio =
              Math.round((b.horaInicioMin - desde) / MINUTOS_POR_RANURA) + 1;
            const filaFin =
              Math.round((b.horaFinMin - desde) / MINUTOS_POR_RANURA) + 1;
            const colores = AREAS[f.colaborador.area];
            const etiqueta = `${f.colaborador.nombre}: ${rangoLegible(
              b.horaInicioMin,
              b.horaFinMin,
            )}`;

            // La foto va arriba y el nombre en vertical debajo. Con varias
            // personas de la misma área el color ya no alcanza para
            // distinguirlas, y la cara se reconoce más rápido que un nombre
            // rotado.
            const contenido = (
              <span className="flex h-full w-full flex-col items-center gap-1 py-1">
                <Avatar
                  nombre={f.colaborador.nombre}
                  foto={f.colaborador.foto}
                  area={f.colaborador.area}
                  tamano="xs"
                />
                <span
                  className="min-h-0 flex-1 truncate text-[11px] font-semibold"
                  // El nombre va en vertical porque la barra es angosta y alta;
                  // rotado para leerse de abajo hacia arriba.
                  style={{ writingMode: "vertical-rl", rotate: "180deg" }}
                >
                  {f.colaborador.nombre.split(/\s+/)[0]}
                </span>
              </span>
            );

            const clases = `flex items-start justify-center overflow-hidden rounded-md ${colores.fondo} ${colores.texto}`;

            return admin ? (
              <button
                key={`${f.colaborador.id}-${i}`}
                type="button"
                title={`${etiqueta} — clic para editar`}
                onClick={() => onEditar(f.colaborador.id)}
                style={{
                  gridColumn: columna + 1,
                  gridRow: `${filaInicio} / ${filaFin}`,
                }}
                className={`${clases} ring-inset hover:ring-2 hover:ring-acento/40`}
              >
                {contenido}
              </button>
            ) : (
              <span
                key={`${f.colaborador.id}-${i}`}
                title={etiqueta}
                style={{
                  gridColumn: columna + 1,
                  gridRow: `${filaInicio} / ${filaFin}`,
                }}
                className={clases}
              >
                {contenido}
              </span>
            );
          }),
      )}
    </div>
  );
}

function GrillaTramo({
  filas,
  tramo,
  admin,
  onEditar,
}: {
  filas: FilaHorario[];
  tramo: Tramo;
  admin: boolean;
  onEditar: (colaboradorId: string) => void;
}) {
  const desde = alineado(tramo.desde);
  const ranuras = Math.ceil((tramo.hasta - desde) / MINUTOS_POR_RANURA);
  const etiquetas = Math.ceil(ranuras / RANURAS_ENTRE_ETIQUETAS);

  return (
    <div className="grid grid-cols-[64px_repeat(6,minmax(140px,1fr))]">
      {/* Columna de horas */}
      <div
        className="grid"
        style={{ gridTemplateRows: `repeat(${ranuras}, ${ALTO_RANURA}px)` }}
      >
        {Array.from({ length: etiquetas }, (_, i) => {
          const minuto = desde + i * MINUTOS_ENTRE_ETIQUETAS;
          return (
            <div
              key={minuto}
              style={{
                gridRow: `${i * RANURAS_ENTRE_ETIQUETAS + 1} / span ${RANURAS_ENTRE_ETIQUETAS}`,
              }}
              className="border-t border-borde/60 px-3 pt-0.5 text-[11px] font-medium tabular-nums text-texto-suave"
            >
              {aHoraLocal(minuto)}
            </div>
          );
        })}
      </div>

      {DIAS.map((dia) => (
        <ColumnaDia
          key={dia.clave}
          filas={filas}
          dia={dia}
          tramo={tramo}
          admin={admin}
          onEditar={onEditar}
        />
      ))}
    </div>
  );
}

export function VistaPorHora({
  filas,
  admin,
  onEditar,
}: {
  filas: FilaHorario[];
  admin: boolean;
  onEditar: (colaboradorId: string) => void;
}) {
  const tramos = calcularTramos(filas);
  // Quien no trabaja ninguna hora no aparece en ninguna barra: sin este pie,
  // el admin no tendría desde dónde asignarle su primer horario.
  const sinHorario = filas.filter((f) => f.bloques.length === 0);

  if (tramos.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay horarios cargados"
        detalle="Asigná el horario de alguien y acá vas a ver quién trabaja en cada franja."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-borde bg-superficie">
        <div className="min-w-[960px]">
          {/* Encabezado de días */}
          <div className="grid grid-cols-[64px_repeat(6,minmax(140px,1fr))] border-b border-borde bg-fondo/60">
            <div className="p-3 text-xs font-semibold text-texto-suave">
              Hora
            </div>
            {DIAS.map((dia) => (
              <div
                key={dia.clave}
                className="border-l border-borde p-3 text-center text-xs font-semibold uppercase tracking-wide text-texto-suave"
              >
                {dia.etiqueta}
              </div>
            ))}
          </div>

          {tramos.map((tramo, i) => (
            <div key={tramo.desde}>
              {/* Separador entre mañana y tarde: sale del hueco real en que no
                  trabaja nadie, no de una hora fijada a mano. */}
              {i > 0 && (
                <div className="flex items-center gap-3 border-y border-borde bg-fondo/40 px-3 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-texto-suave">
                    Corte
                  </span>
                  <span className="text-[11px] text-texto-suave/80">
                    {rangoLegible(tramos[i - 1].hasta, tramo.desde)}
                  </span>
                </div>
              )}
              <GrillaTramo
                filas={filas}
                tramo={tramo}
                admin={admin}
                onEditar={onEditar}
              />
            </div>
          ))}
        </div>
      </div>

      {sinHorario.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave">
          <span>Sin horario asignado:</span>
          {sinHorario.map((f, i) => (
            <span key={f.colaborador.id} className="flex items-center gap-1">
              {admin ? (
                <button
                  type="button"
                  onClick={() => onEditar(f.colaborador.id)}
                  className="font-semibold text-acento hover:underline"
                >
                  {f.colaborador.nombre}
                </button>
              ) : (
                <span>{f.colaborador.nombre}</span>
              )}
              {i < sinHorario.length - 1 && <span>·</span>}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
