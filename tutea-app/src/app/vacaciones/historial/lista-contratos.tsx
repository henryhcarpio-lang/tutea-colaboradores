"use client";

import { useState } from "react";
import type { Collaborator } from "@prisma/client";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import { BarraVacaciones } from "../barra-vacaciones";

type Uso = { id: string; fechaInicio: string; fechaFin: string; dias: number; observacion: string | null };

type Contrato = {
  id: string;
  desde: string;
  hasta: string;
  diasAsignados: number;
  cerradoEn: string;
  usos: Uso[];
};

export type ContratoColaborador = {
  colaborador: Pick<Collaborator, "id" | "nombre" | "foto" | "area">;
  contratos: Contrato[];
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

function TarjetaContrato({ contrato }: { contrato: Contrato }) {
  const usados = contrato.usos.reduce((t, u) => t + u.dias, 0);
  const excedente = Math.max(0, usados - contrato.diasAsignados);

  return (
    <li className="rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {fecha(contrato.desde)} — {fecha(contrato.hasta)}
        </p>
        <p className="text-xs text-texto-suave">
          Archivado el {fecha(contrato.cerradoEn, true)}
        </p>
      </div>

      <div className="mt-3">
        <BarraVacaciones
          asignados={contrato.diasAsignados}
          usos={contrato.usos.map((u) => ({
            id: u.id,
            dias: u.dias,
            etiqueta: `${fecha(u.fechaInicio)} – ${fecha(u.fechaFin)}: ${u.dias} días`,
          }))}
        />
      </div>

      <p className="mt-2 text-sm text-texto-suave">
        Usó {usados} de {contrato.diasAsignados}
        {excedente > 0 && (
          <span className="font-semibold text-peligro">
            {" "}
            · {excedente} de adelanto
          </span>
        )}
      </p>

      {contrato.usos.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-borde pt-3">
          {contrato.usos.map((uso) => (
            <li key={uso.id} className="flex flex-wrap items-center gap-2 text-xs text-texto-suave">
              <span className="w-40 shrink-0 font-medium text-texto">
                {fecha(uso.fechaInicio)} – {fecha(uso.fechaFin)}
              </span>
              <span className="rounded-full bg-acento-suave px-2 py-0.5 text-[10px] font-semibold text-acento-fuerte">
                {uso.dias} {uso.dias === 1 ? "día" : "días"}
              </span>
              {uso.observacion && <span>{uso.observacion}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ListaContratos({
  historiales,
}: {
  historiales: ContratoColaborador[];
}) {
  const [colaboradorId, setColaboradorId] = useState<string>(
    historiales.find((h) => h.contratos.length > 0)?.colaborador.id ??
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
              {h.contratos.length > 0 ? ` (${h.contratos.length})` : ""}
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

          {elegido.contratos.length === 0 ? (
            <EstadoVacio
              titulo="Sin contratos cerrados"
              detalle="Esta persona todavía no tiene ningún contrato archivado."
            />
          ) : (
            <ul className="space-y-3">
              {elegido.contratos.map((contrato) => (
                <TarjetaContrato key={contrato.id} contrato={contrato} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
