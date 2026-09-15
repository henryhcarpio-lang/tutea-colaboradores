"use client";

import { useState } from "react";
import type { Collaborator, TipoVida } from "@prisma/client";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import { Corazones } from "../corazones";
import { contarQueDescuentan, TIPOS_VIDA } from "@/lib/tipo-vida";

type Uso = { id: string; fecha: string; tipo: TipoVida; motivo: string | null };

type Cierre = {
  id: string;
  mes: string;
  vidasAsignadas: number;
  cerradoEn: string;
  usos: Uso[];
};

export type CierreColaborador = {
  colaborador: Pick<Collaborator, "id" | "nombre" | "foto" | "area">;
  cierres: Cierre[];
};

const CLASE_SELECT =
  "rounded-xl border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

function fecha(iso: string, conHora = false): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: conHora ? "America/Lima" : "UTC",
  });
}

function TarjetaCierre({ cierre }: { cierre: Cierre }) {
  const usadas = contarQueDescuentan(cierre.usos);
  const excedidas = Math.max(0, usadas - cierre.vidasAsignadas);

  return (
    <li className="rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold first-letter:uppercase">{cierre.mes}</p>
        <p className="text-xs text-texto-suave">
          Archivado el {fecha(cierre.cerradoEn, true)}
        </p>
      </div>

      <div className="mt-3">
        <Corazones
          asignadas={cierre.vidasAsignadas}
          usos={cierre.usos.map((u) => ({ id: u.id, tipo: u.tipo }))}
          idAnimado={null}
        />
      </div>

      <p className="mt-2 text-sm text-texto-suave">
        Usó {usadas} de {cierre.vidasAsignadas}
        {excedidas > 0 && (
          <span className="font-semibold text-peligro">
            {" "}
            · {excedidas} por encima del cupo
          </span>
        )}
      </p>

      {usadas > 0 && (
        <ul className="mt-3 space-y-1 border-t border-borde pt-3">
          {cierre.usos.map((uso) => (
            <li key={uso.id} className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
              <span className="w-32 shrink-0 font-medium text-texto">
                {fecha(uso.fecha)}
              </span>
              {uso.tipo !== "general" && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: TIPOS_VIDA[uso.tipo].color }}
                >
                  {TIPOS_VIDA[uso.tipo].etiqueta}
                </span>
              )}
              {!TIPOS_VIDA[uso.tipo].descuentaCupo && (
                <span className="italic text-texto-suave/80">no descuenta</span>
              )}
              {uso.motivo !== null ? (
                <span>{uso.motivo}</span>
              ) : (
                <span className="italic">motivo reservado</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ListaCierres({
  historiales,
}: {
  historiales: CierreColaborador[];
}) {
  const [colaboradorId, setColaboradorId] = useState<string>(
    historiales.find((h) => h.cierres.length > 0)?.colaborador.id ??
      historiales[0]?.colaborador.id ??
      "",
  );

  const elegido = historiales.find((h) => h.colaborador.id === colaboradorId);

  return (
    <div className="space-y-5">
      <label className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
        Colaborador
        <select
          value={colaboradorId}
          onChange={(e) => setColaboradorId(e.target.value)}
          className={CLASE_SELECT}
        >
          {historiales.map((h) => (
            <option key={h.colaborador.id} value={h.colaborador.id}>
              {h.colaborador.nombre}
              {h.cierres.length > 0 ? ` (${h.cierres.length})` : ""}
            </option>
          ))}
        </select>
      </label>

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

          {elegido.cierres.length === 0 ? (
            <EstadoVacio
              titulo="Sin meses cerrados"
              detalle="Esta persona todavía no tiene ningún período archivado."
            />
          ) : (
            <ul className="space-y-3">
              {elegido.cierres.map((cierre) => (
                <TarjetaCierre key={cierre.id} cierre={cierre} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
