"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { Collaborator } from "@prisma/client";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import { Corazones } from "./corazones";
import {
  ajustarCupo,
  anularUso,
  reiniciarMes,
  usarVida,
  type EstadoVida,
} from "./acciones";

export type Uso = {
  id: string;
  fecha: string;
  /** Solo llega al navegador si quien mira es admin (§2 del spec). */
  motivo: string | null;
};

export type FilaVidas = {
  colaborador: Pick<Collaborator, "id" | "nombre" | "foto" | "area">;
  periodoId: string;
  vidasAsignadas: number;
  usos: Uso[];
};

const ESTADO_INICIAL: EstadoVida = {};

const CLASE_CAMPO =
  "w-full rounded-xl border border-borde bg-superficie px-3 py-2 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
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
  const [estado, accion, pendiente] = useActionState(usarVida, ESTADO_INICIAL);
  const [fecha, setFecha] = useState(hoy);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  return (
    <form action={accion} className="aparecer mt-3 rounded-xl bg-fondo/70 p-3">
      <input type="hidden" name="periodoId" value={periodoId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium">
          Fecha
          <input
            type="date"
            name="fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${CLASE_CAMPO} mt-1`}
          />
        </label>
        <label className="min-w-[180px] flex-1 text-xs font-medium">
          Motivo
          <input
            name="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={200}
            placeholder="Trámite personal, salud, familiar…"
            autoFocus
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
      {estado.error && (
        <p role="alert" className="mt-2 text-sm text-peligro">
          {estado.error}
        </p>
      )}
      <p className="mt-2 text-xs text-texto-suave">
        El motivo solo lo ve gerencia: no aparece en la vista pública.
      </p>
    </form>
  );
}

function Tarjeta({
  fila,
  admin,
  hoy,
}: {
  fila: FilaVidas;
  admin: boolean;
  hoy: string;
}) {
  const [registrando, setRegistrando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  const [pendiente, iniciar] = useTransition();

  // Se anima solo el corazón recién gastado, comparando con el render previo.
  const usadasPrevias = useRef(fila.usos.length);
  const [indiceAnimado, setIndiceAnimado] = useState<number | null>(null);

  useEffect(() => {
    if (fila.usos.length > usadasPrevias.current) {
      setIndiceAnimado(fila.usos.length - 1);
      const t = setTimeout(() => setIndiceAnimado(null), 600);
      usadasPrevias.current = fila.usos.length;
      return () => clearTimeout(t);
    }
    usadasPrevias.current = fila.usos.length;
  }, [fila.usos.length]);

  const usadas = fila.usos.length;
  const disponibles = Math.max(0, fila.vidasAsignadas - usadas);

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
          <div className="mt-2">
            <Corazones
              asignadas={fila.vidasAsignadas}
              usadas={usadas}
              indiceAnimado={indiceAnimado}
            />
          </div>
          <p className="mt-1.5 text-xs text-texto-suave">
            {disponibles} de {fila.vidasAsignadas}{" "}
            {fila.vidasAsignadas === 1 ? "vida disponible" : "vidas disponibles"}
            {usadas > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setVerDetalle((v) => !v)}
                  className="hover:text-texto hover:underline"
                >
                  {verDetalle ? "ocultar" : "ver"} los {usadas} usos
                </button>
              </>
            )}
          </p>
        </div>

        {admin && (
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <div className="flex items-center gap-1 rounded-xl border border-borde p-0.5">
              <button
                type="button"
                title="Quitar una vida del cupo de este mes"
                disabled={pendiente || fila.vidasAsignadas === 0}
                onClick={() =>
                  iniciar(() => {
                    void ajustarCupo(fila.periodoId, -1);
                  })
                }
                className="h-7 w-7 rounded-lg text-sm font-semibold text-texto-suave hover:bg-fondo disabled:opacity-40"
              >
                −
              </button>
              <span className="w-4 text-center text-xs tabular-nums text-texto-suave">
                {fila.vidasAsignadas}
              </span>
              <button
                type="button"
                title="Agregar una vida al cupo de este mes"
                disabled={pendiente || fila.vidasAsignadas >= 10}
                onClick={() =>
                  iniciar(() => {
                    void ajustarCupo(fila.periodoId, 1);
                  })
                }
                className="h-7 w-7 rounded-lg text-sm font-semibold text-texto-suave hover:bg-fondo disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRegistrando(true)}
              disabled={registrando}
              className="rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-fondo disabled:opacity-60"
            >
              Usar vida
            </button>
          </div>
        )}
      </div>

      {registrando && admin && (
        <FormularioUso
          periodoId={fila.periodoId}
          hoy={hoy}
          onCerrar={() => setRegistrando(false)}
        />
      )}

      {verDetalle && (
        <ul className="mt-3 space-y-1 border-t border-borde pt-3">
          {fila.usos.map((uso) => (
            <li
              key={uso.id}
              className="flex flex-wrap items-center gap-x-2 text-xs text-texto-suave"
            >
              <span className="font-medium text-texto">
                {fechaCorta(uso.fecha)}
              </span>
              {uso.motivo !== null ? (
                <span>{uso.motivo}</span>
              ) : (
                <span className="italic">motivo reservado</span>
              )}
              {admin && (
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() =>
                    iniciar(() => {
                      void anularUso(uso.id);
                    })
                  }
                  className="ml-auto hover:text-peligro hover:underline disabled:opacity-50"
                >
                  anular
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function PanelVidas({
  filas,
  admin,
  hoy,
  etiquetaMes,
}: {
  filas: FilaVidas[];
  admin: boolean;
  hoy: string;
  etiquetaMes: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  if (filas.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay colaboradores"
        detalle="Cargá al equipo y cada persona va a aparecer acá con sus corazones del mes."
      />
    );
  }

  return (
    <div className="space-y-4">
      {admin && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {confirmando ? (
            <>
              <p className="mr-auto text-sm text-texto-suave">
                Se archiva {etiquetaMes} y todos vuelven a su cupo completo. Los
                permisos ya registrados quedan guardados en el historial.
              </p>
              <button
                type="button"
                disabled={pendiente}
                onClick={() =>
                  iniciar(() => {
                    void reiniciarMes();
                    setConfirmando(false);
                  })
                }
                className="rounded-xl bg-peligro px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pendiente ? "Reiniciando…" : "Sí, reiniciar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="rounded-xl px-2 py-2 text-sm text-texto-suave hover:text-texto"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
            >
              Reiniciar el mes
            </button>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {filas.map((fila) => (
          <Tarjeta
            key={fila.colaborador.id}
            fila={fila}
            admin={admin}
            hoy={hoy}
          />
        ))}
      </ul>
    </div>
  );
}
