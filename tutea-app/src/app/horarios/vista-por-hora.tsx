"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/avatar";
import { EstadoVacio } from "@/components/seccion";
import { colorPorIndice } from "@/lib/color-persona";
import { DIAS, aHoraLocal, rangoLegible, type BloqueSimple } from "@/lib/horarios";
import type { DiaSemana } from "@prisma/client";
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
/** Ancho reservado por carril, con la foto adentro. */
const ANCHO_POR_PERSONA = 40;
const ANCHO_MINIMO_DIA = 90;
const ANCHO_COLUMNA_HORA = 52;
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

type BloqueDelDia = {
  colaborador: FilaHorario["colaborador"];
  colorIndice: number;
  bloque: BloqueSimple;
};

/**
 * Asigna cada bloque de un día a un "carril", igual que hacen los
 * calendarios: dos bloques que se solapan en el tiempo van a carriles
 * distintos, y dos que NUNCA coinciden pueden compartir uno aunque sean de
 * personas distintas.
 *
 * Antes, cada persona se quedaba con su propia columna aunque nunca coincidiera
 * con nadie en ese tramo: alguien de 9 a 10 y otro de 12 a 13 dentro de un
 * mismo tramo de 9 a 13 contaban como "2 columnas necesarias" sin haber
 * estado nunca al mismo tiempo. Eso inflaba el ancho que la columna del día
 * pedía muy por encima de lo real, y los avatares —de tamaño fijo— terminaban
 * desbordando sus casillas y superponiéndose con las de al lado.
 *
 * Con este barrido tipo "greedy interval scheduling", el número de carriles
 * que se termina usando es exactamente el pico real de gente simultánea ese
 * día: ni uno más.
 */
function asignarCarriles(
  filas: FilaHorario[],
  dia: DiaSemana,
): { carriles: number; carrilDe: Map<BloqueSimple, number> } {
  const items: BloqueDelDia[] = [];
  filas.forEach((f, indice) => {
    for (const b of f.bloques) {
      if (b.diaSemana === dia) {
        items.push({ colaborador: f.colaborador, colorIndice: indice, bloque: b });
      }
    }
  });
  items.sort((a, b) => a.bloque.horaInicioMin - b.bloque.horaInicioMin);

  const finDeCarril: number[] = [];
  const carrilDe = new Map<BloqueSimple, number>();
  for (const { bloque } of items) {
    let asignado = finDeCarril.findIndex((fin) => fin <= bloque.horaInicioMin);
    if (asignado === -1) {
      asignado = finDeCarril.length;
      finDeCarril.push(bloque.horaFinMin);
    } else {
      finDeCarril[asignado] = bloque.horaFinMin;
    }
    carrilDe.set(bloque, asignado);
  }
  return { carriles: finDeCarril.length, carrilDe };
}

type CarrilesPorDia = Record<DiaSemana, { carriles: number; carrilDe: Map<BloqueSimple, number> }>;

function columnasDeLaGrilla(carrilesPorDia: CarrilesPorDia): string {
  const anchos = DIAS.map((d) =>
    Math.max(ANCHO_MINIMO_DIA, carrilesPorDia[d.clave].carriles * ANCHO_POR_PERSONA),
  );
  return `${ANCHO_COLUMNA_HORA}px ${anchos.map((a) => `minmax(${a}px, 1fr)`).join(" ")}`;
}

function anchoTotal(carrilesPorDia: CarrilesPorDia): number {
  return (
    ANCHO_COLUMNA_HORA +
    DIAS.reduce(
      (t, d) =>
        t + Math.max(ANCHO_MINIMO_DIA, carrilesPorDia[d.clave].carriles * ANCHO_POR_PERSONA),
      0,
    )
  );
}

/** Redondea el inicio del tramo hacia abajo a la etiqueta anterior. */
function alineado(minutos: number): number {
  return Math.floor(minutos / MINUTOS_ENTRE_ETIQUETAS) * MINUTOS_ENTRE_ETIQUETAS;
}

function ColumnaDia({
  filas,
  dia,
  tramo,
  carriles,
  carrilDe,
  admin,
  onEditar,
}: {
  filas: FilaHorario[];
  dia: (typeof DIAS)[number];
  tramo: Tramo;
  carriles: number;
  carrilDe: Map<BloqueSimple, number>;
  admin: boolean;
  onEditar: (colaboradorId: string) => void;
}) {
  const desde = alineado(tramo.desde);
  const ranuras = Math.ceil((tramo.hasta - desde) / MINUTOS_POR_RANURA);

  if (carriles === 0) {
    return (
      <div className="grid place-items-start justify-center border-l border-borde pt-2">
        <span className="text-xs text-texto-suave/50">—</span>
      </div>
    );
  }

  // Los bloques activos en este tramo, cada uno con el carril fijo que le
  // tocó para todo el día (no solo para este tramo): así una persona no
  // "salta" de columna entre la franja de la mañana y la de la tarde.
  const bloquesDelTramo = filas.flatMap((f, indice) =>
    f.bloques
      .filter(
        (b) =>
          b.diaSemana === dia.clave &&
          b.horaInicioMin < tramo.hasta &&
          b.horaFinMin > tramo.desde,
      )
      .map((b) => ({ colaborador: f.colaborador, colorIndice: indice, bloque: b })),
  );

  return (
    <div
      className="grid gap-x-1 border-l border-borde px-0.5"
      style={{
        gridTemplateColumns: `repeat(${carriles}, minmax(${ANCHO_POR_PERSONA - 6}px, 1fr))`,
        gridTemplateRows: `repeat(${ranuras}, ${ALTO_RANURA}px)`,
      }}
    >
      {bloquesDelTramo.map(({ colaborador, colorIndice, bloque: b }) => {
        const carril = carrilDe.get(b)!;
        const filaInicio = Math.round((b.horaInicioMin - desde) / MINUTOS_POR_RANURA) + 1;
        const filaFin = Math.round((b.horaFinMin - desde) / MINUTOS_POR_RANURA) + 1;
        // Color por persona, no por área: con dos o más colegas de la misma
        // área en la misma franja, el color de área ya no alcanza para
        // distinguirlos. Sale de una paleta elegida a mano (src/lib/color-persona.ts),
        // no de un hash, para garantizar combinaciones que se vean bien.
        const colores = colorPorIndice(colorIndice);
        const etiqueta = `${colaborador.nombre}: ${rangoLegible(b.horaInicioMin, b.horaFinMin)}`;

        // La foto va arriba y el nombre en vertical debajo. La cara se
        // reconoce más rápido que un nombre rotado.
        const contenido = (
          <span className="flex h-full w-full flex-col items-center gap-1 py-1">
            <Avatar
              nombre={colaborador.nombre}
              foto={colaborador.foto}
              area={colaborador.area}
              tamano="xs"
            />
            <span
              className="min-h-0 flex-1 truncate text-[11px] font-semibold"
              // El nombre va en vertical porque la barra es angosta y alta;
              // rotado para leerse de abajo hacia arriba.
              style={{ writingMode: "vertical-rl", rotate: "180deg" }}
            >
              {colaborador.nombre.split(/\s+/)[0]}
            </span>
          </span>
        );

        const estilo = {
          gridColumn: carril + 1,
          gridRow: `${filaInicio} / ${filaFin}`,
          backgroundColor: colores.fondo,
          color: colores.texto,
          // Un halo del color de fondo de la página alrededor de cada barra:
          // aunque dos carriles queden a un par de píxeles de distancia, este
          // "borde" los separa con claridad y evita que se lean pegados o
          // encimados cuando hay mucha gente a la vez en el mismo tramo.
          boxShadow: "0 0 0 2px var(--superficie)",
        };
        const clases = "relative flex items-start justify-center overflow-hidden rounded-md";
        const key = `${colaborador.id}-${b.horaInicioMin}`;

        return admin ? (
          <button
            key={key}
            type="button"
            title={`${etiqueta} — clic para editar`}
            onClick={() => onEditar(colaborador.id)}
            style={estilo}
            className={`${clases} ring-inset hover:ring-2 hover:ring-acento/40`}
          >
            {contenido}
          </button>
        ) : (
          <span key={key} title={etiqueta} style={estilo} className={clases}>
            {contenido}
          </span>
        );
      })}
    </div>
  );
}

function GrillaTramo({
  filas,
  tramo,
  columnas,
  carrilesPorDia,
  admin,
  onEditar,
}: {
  filas: FilaHorario[];
  tramo: Tramo;
  columnas: string;
  carrilesPorDia: CarrilesPorDia;
  admin: boolean;
  onEditar: (colaboradorId: string) => void;
}) {
  const desde = alineado(tramo.desde);
  const ranuras = Math.ceil((tramo.hasta - desde) / MINUTOS_POR_RANURA);
  const etiquetas = Math.ceil(ranuras / RANURAS_ENTRE_ETIQUETAS);

  return (
    <div className="grid" style={{ gridTemplateColumns: columnas }}>
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
              className="border-t border-borde/60 px-2 pt-0.5 text-[11px] font-medium tabular-nums text-texto-suave"
            >
              {aHoraLocal(minuto)}
            </div>
          );
        })}
      </div>

      {DIAS.map((dia) => {
        const { carriles, carrilDe } = carrilesPorDia[dia.clave];
        return (
          <ColumnaDia
            key={dia.clave}
            filas={filas}
            dia={dia}
            tramo={tramo}
            carriles={carriles}
            carrilDe={carrilDe}
            admin={admin}
            onEditar={onEditar}
          />
        );
      })}
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
  const tramos = useMemo(() => calcularTramos(filas), [filas]);
  const carrilesPorDia = useMemo(
    () =>
      Object.fromEntries(
        DIAS.map((d) => [d.clave, asignarCarriles(filas, d.clave)]),
      ) as CarrilesPorDia,
    [filas],
  );
  const columnas = columnasDeLaGrilla(carrilesPorDia);
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
        <div style={{ minWidth: anchoTotal(carrilesPorDia) }}>
          {/* Encabezado de días */}
          <div
            className="grid border-b border-borde bg-fondo/60"
            style={{ gridTemplateColumns: columnas }}
          >
            <div className="p-2 text-xs font-semibold text-texto-suave">
              Hora
            </div>
            {DIAS.map((dia) => (
              <div
                key={dia.clave}
                className="border-l border-borde p-2 text-center text-xs font-semibold uppercase tracking-wide text-texto-suave"
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
                columnas={columnas}
                carrilesPorDia={carrilesPorDia}
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
