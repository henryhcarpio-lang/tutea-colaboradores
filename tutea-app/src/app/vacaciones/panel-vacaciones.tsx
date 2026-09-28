"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { Collaborator } from "@prisma/client";
import { CalendarPlus, Minus, Plane, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import { diasHabilesLimaSabado } from "@/lib/vacaciones";
import { BarraVacaciones } from "./barra-vacaciones";
import {
  ajustarDiasAsignados,
  anularVacacion,
  registrarVacacion,
  type EstadoVacacion,
} from "./acciones";

const ESTADO_INICIAL: EstadoVacacion = {};

const CLASE_CAMPO =
  "w-full rounded-xl border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

export type Uso = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  observacion: string | null;
};

export type Periodo = {
  id: string;
  desde: string;
  hasta: string;
  diasAsignados: number;
  usos: Uso[];
};

export type FilaVacaciones = {
  colaborador: Pick<Collaborator, "id" | "nombre" | "foto" | "area">;
  periodo: Periodo | null;
  /** Por qué no hay período activo, cuando `periodo` es null. */
  motivoSinPeriodo: "sin_contrato" | "vencido" | null;
  /** Último día del goce en curso, si hoy está de vacaciones. */
  vacacionesHasta: string | null;
};

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Si la persona está o no de vacaciones hoy. Es lo único que el resto del
 * equipo necesita saber: ¿puedo contar con esta persona o no? A gerencia se
 * le suma hasta cuándo, para organizar el trabajo mientras tanto.
 */
function EstadoHoy({ hasta, admin }: { hasta: string | null; admin: boolean }) {
  if (!hasta) {
    return (
      <span className="rounded-full bg-fondo px-2.5 py-0.5 text-xs text-texto-suave">
        No está de vacaciones
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-exito-suave px-2.5 py-0.5 text-xs font-semibold text-exito">
      <Plane aria-hidden size={12} strokeWidth={2} />
      De vacaciones{admin && ` hasta el ${fechaCorta(hasta)}`}
    </span>
  );
}

function FormularioUso({
  periodoId,
  hoy,
  onCerrar,
}: {
  periodoId: string;
  hoy: string;
  onCerrar: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(registrarVacacion, ESTADO_INICIAL);
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState(hoy);
  // `null` = todavía sigue el cálculo automático; un string = la persona ya
  // editó el campo a mano (el adelanto puede no coincidir con el conteo
  // automático), y ese valor no se vuelve a pisar aunque cambien las fechas.
  const [diasManual, setDiasManual] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");

  const diasCalculados = (() => {
    const d = new Date(`${inicio}T00:00:00.000Z`);
    const f = new Date(`${fin}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()) || Number.isNaN(f.getTime()) || f < d) return 0;
    return diasHabilesLimaSabado(d, f);
  })();
  const dias = diasManual ?? String(diasCalculados);

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  return (
    <form action={accion} className="aparecer mt-3 rounded-xl bg-fondo/70 p-3">
      <input type="hidden" name="periodoId" value={periodoId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium">
          Desde
          <input
            type="date"
            name="fechaInicio"
            value={inicio}
            onChange={(e) => {
              setInicio(e.target.value);
              if (e.target.value > fin) setFin(e.target.value);
            }}
            className={`${CLASE_CAMPO} mt-1`}
          />
        </label>
        <label className="text-xs font-medium">
          Hasta
          <input
            type="date"
            name="fechaFin"
            value={fin}
            min={inicio}
            onChange={(e) => setFin(e.target.value)}
            className={`${CLASE_CAMPO} mt-1`}
          />
        </label>
        <label className="w-24 text-xs font-medium">
          Días
          <input
            type="number"
            name="dias"
            min={1}
            max={365}
            value={dias}
            onChange={(e) => setDiasManual(e.target.value)}
            className={`${CLASE_CAMPO} mt-1`}
          />
        </label>
        <label className="min-w-[180px] flex-1 text-xs font-medium">
          Observación{" "}
          <span className="font-normal text-texto-suave">(opcional)</span>
          <input
            name="observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            maxLength={300}
            placeholder="Adelanto, viaje familiar…"
            className={`${CLASE_CAMPO} mt-1`}
          />
        </label>
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-xl bg-acento px-3 py-2 text-sm font-semibold text-white hover:bg-acento-fuerte disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Registrar"}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-xl px-2 py-2 text-sm text-texto-suave hover:text-texto"
        >
          Cancelar
        </button>
      </div>
      {diasManual === null && (
        <p className="mt-2 text-xs text-texto-suave">
          Los días se calculan solos (lunes a sábado, sin contar domingos). Se
          pueden editar a mano si el caso es una excepción.
        </p>
      )}
      {estado.error && (
        <p role="alert" className="mt-2 text-sm text-peligro">
          {estado.error}
        </p>
      )}
    </form>
  );
}

function Tarjeta({
  fila,
  admin,
  hoy,
}: {
  fila: FilaVacaciones;
  admin: boolean;
  hoy: string;
}) {
  const [registrando, setRegistrando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <li className="rounded-2xl border border-borde bg-superficie p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          nombre={fila.colaborador.nombre}
          foto={fila.colaborador.foto}
          area={fila.colaborador.area}
          tamano="md"
        />

        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{fila.colaborador.nombre}</p>
            <InsigniaArea area={fila.colaborador.area} />
          </div>

          <div className="mt-2 flex">
            <EstadoHoy hasta={fila.vacacionesHasta} admin={admin} />
          </div>

          {/* Para el resto del equipo, las vacaciones de cada persona son
              solo si está o no de vacaciones hoy: el saldo, las fechas del
              contrato y el detalle de cada goce no son asunto de todos.
              Gerencia sí ve todo, para poder gestionarlo. */}
          {!admin ? null : !fila.periodo ? (
            // Sin período no hay nada que dibujar como barra: se explica
            // por qué (falta el contrato, o ya venció).
            <p className="mt-2 text-xs italic text-texto-suave">
              {fila.motivoSinPeriodo === "vencido"
                ? "Su contrato ya venció: carga el contrato nuevo en su ficha para reabrir el cupo."
                : "Falta el inicio o el fin de contrato: se carga en la ficha del colaborador."}
            </p>
          ) : (
            <>
              {(() => {
                const p = fila.periodo;
                const usados = p.usos.reduce((t, u) => t + u.dias, 0);
                const disponibles = Math.max(0, p.diasAsignados - usados);
                const excedente = Math.max(0, usados - p.diasAsignados);
                return (
                  <>
                    {admin && (
                      <p className="mt-0.5 text-xs text-texto-suave">
                        Contrato del {fechaCorta(p.desde)} al {fechaCorta(p.hasta)}
                      </p>
                    )}
                    <div className="mt-2">
                      <BarraVacaciones
                        asignados={p.diasAsignados}
                        usos={p.usos.map((u) => ({
                          id: u.id,
                          dias: u.dias,
                          etiqueta: `${fechaCorta(u.fechaInicio)} – ${fechaCorta(u.fechaFin)}: ${u.dias} días`,
                        }))}
                      />
                    </div>
                    {admin && (
                      <p className="mt-1.5 text-xs text-texto-suave">
                        {disponibles} de {p.diasAsignados} días restantes
                        {excedente > 0 && (
                          <span className="font-semibold text-peligro">
                            {" "}
                            · {excedente} de adelanto
                          </span>
                        )}
                        {p.usos.length > 0 && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => setVerDetalle((v) => !v)}
                              className="hover:text-texto hover:underline"
                            >
                              {verDetalle ? "ocultar" : "ver"}{" "}
                              {p.usos.length === 1 ? "el" : "los"} {p.usos.length}{" "}
                              {p.usos.length === 1 ? "período tomado" : "períodos tomados"}
                            </button>
                          </>
                        )}
                      </p>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>

        {admin && fila.periodo && (
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <div className="flex items-center gap-1 rounded-xl border border-borde p-0.5">
              <button
                type="button"
                title="Quitar un día del cupo de este contrato"
                disabled={pendiente || fila.periodo.diasAsignados === 0}
                onClick={() =>
                  iniciar(() => {
                    void ajustarDiasAsignados(fila.periodo!.id, -1);
                  })
                }
                className="grid h-7 w-7 place-items-center rounded-lg text-texto-suave hover:bg-fondo disabled:opacity-40"
              >
                <Minus aria-hidden size={15} strokeWidth={2} />
              </button>
              <span className="w-6 text-center text-xs tabular-nums text-texto-suave">
                {fila.periodo.diasAsignados}
              </span>
              <button
                type="button"
                title="Agregar un día al cupo de este contrato"
                disabled={pendiente || fila.periodo.diasAsignados >= 60}
                onClick={() =>
                  iniciar(() => {
                    void ajustarDiasAsignados(fila.periodo!.id, 1);
                  })
                }
                className="grid h-7 w-7 place-items-center rounded-lg text-texto-suave hover:bg-fondo disabled:opacity-40"
              >
                <Plus aria-hidden size={15} strokeWidth={2} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRegistrando(true)}
              disabled={registrando}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-fondo disabled:opacity-60"
            >
              <CalendarPlus aria-hidden size={15} strokeWidth={1.75} />
              Registrar vacaciones
            </button>
          </div>
        )}
      </div>

      {registrando && admin && fila.periodo && (
        <FormularioUso
          periodoId={fila.periodo.id}
          hoy={hoy}
          onCerrar={() => setRegistrando(false)}
        />
      )}

      {verDetalle && fila.periodo && (
        <ul className="mt-3 space-y-1 border-t border-borde pt-3">
          {fila.periodo.usos.map((uso) => (
            <li
              key={uso.id}
              className="flex flex-wrap items-center gap-x-2 text-xs text-texto-suave"
            >
              <span className="font-medium text-texto">
                {fechaCorta(uso.fechaInicio)} – {fechaCorta(uso.fechaFin)}
              </span>
              <span className="rounded-full bg-acento-suave px-2 py-0.5 text-[10px] font-semibold text-acento-fuerte">
                {uso.dias} {uso.dias === 1 ? "día" : "días"}
              </span>
              {uso.observacion && <span>{uso.observacion}</span>}
              {admin && (
                <button
                  type="button"
                  disabled={pendiente}
                  title="Anular este goce, por si fue un error"
                  onClick={() =>
                    iniciar(() => {
                      void anularVacacion(uso.id);
                    })
                  }
                  className="ml-auto flex items-center gap-1 hover:text-peligro hover:underline disabled:opacity-50"
                >
                  <Trash2 aria-hidden size={13} strokeWidth={1.75} />
                  Anular
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function PanelVacaciones({
  filas,
  admin,
  hoy,
}: {
  filas: FilaVacaciones[];
  admin: boolean;
  hoy: string;
}) {
  if (filas.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay colaboradores"
        detalle="Carga al equipo y cada persona va a aparecer aquí con su saldo de vacaciones."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {filas.map((fila) => (
        <Tarjeta key={fila.colaborador.id} fila={fila} admin={admin} hoy={hoy} />
      ))}
    </ul>
  );
}
