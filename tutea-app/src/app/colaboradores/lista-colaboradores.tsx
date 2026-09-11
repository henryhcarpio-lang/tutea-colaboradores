"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, RotateCcw, Trash2, UserPlus, X } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EstadoVacio } from "@/components/seccion";
import {
  FormularioColaborador,
  type ColaboradorConCupo,
} from "./formulario-colaborador";
import { desactivarColaborador, reactivarColaborador } from "./acciones";

function fechaLegible(fecha: Date): string {
  // La columna es `date`, guardada a medianoche UTC: se lee en UTC para que no
  // se corra un día al mostrarla.
  const d = new Date(fecha);
  return d.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Fila({ colaborador }: { colaborador: ColaboradorConCupo }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  if (editando) {
    return (
      <li>
        <FormularioColaborador
          colaborador={colaborador}
          onCerrar={() => setEditando(false)}
        />
      </li>
    );
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-4 rounded-2xl border border-borde bg-superficie p-4 ${
        colaborador.activo ? "" : "opacity-60"
      }`}
    >
      <Avatar
        nombre={colaborador.nombre}
        foto={colaborador.foto}
        area={colaborador.area}
        tamano="md"
      />

      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{colaborador.nombre}</p>
          <InsigniaArea area={colaborador.area} />
          {!colaborador.activo && (
            <span className="rounded-full bg-fondo px-2.5 py-0.5 text-xs text-texto-suave">
              Inactivo
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-texto-suave">
          {colaborador.fechaNacimiento
            ? `Nace el ${fechaLegible(colaborador.fechaNacimiento)}`
            : "Sin fecha de nacimiento"}{" "}
          ·{" "}
          {colaborador.vidasMensualesDefault}{" "}
          {colaborador.vidasMensualesDefault === 1 ? "vida" : "vidas"} por mes
        </p>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {colaborador.activo ? (
          <>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-fondo"
            >
              <Pencil aria-hidden size={15} strokeWidth={1.75} />
              Editar
            </button>
            {confirmando ? (
              <>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() =>
                    iniciar(() => {
                      void desactivarColaborador(colaborador.id);
                    })
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-peligro px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Check aria-hidden size={15} strokeWidth={2} />
                  {pendiente ? "Quitando…" : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="flex items-center gap-1 text-sm text-texto-suave hover:text-texto"
                >
                  <X aria-hidden size={15} strokeWidth={1.75} />
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-texto-suave hover:bg-peligro-suave hover:text-peligro"
              >
                <Trash2 aria-hidden size={15} strokeWidth={1.75} />
                Quitar
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              iniciar(() => {
                void reactivarColaborador(colaborador.id);
              })
            }
            className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-fondo disabled:opacity-60"
          >
            <RotateCcw aria-hidden size={15} strokeWidth={1.75} />
            {pendiente ? "Reactivando…" : "Reactivar"}
          </button>
        )}
      </div>
    </li>
  );
}

export function ListaColaboradores({
  activos,
  inactivos,
}: {
  activos: ColaboradorConCupo[];
  inactivos: ColaboradorConCupo[];
}) {
  const [creando, setCreando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCreando(true)}
          disabled={creando}
          className="flex items-center gap-2 rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte disabled:opacity-60"
        >
          <UserPlus aria-hidden size={17} strokeWidth={1.75} />
          Nuevo colaborador
        </button>

        {inactivos.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-texto-suave">
            <input
              type="checkbox"
              checked={verInactivos}
              onChange={(e) => setVerInactivos(e.target.checked)}
              className="h-4 w-4 accent-[var(--acento)]"
            />
            Mostrar inactivos ({inactivos.length})
          </label>
        )}
      </div>

      {creando && (
        <FormularioColaborador onCerrar={() => setCreando(false)} />
      )}

      {activos.length === 0 && !creando ? (
        <EstadoVacio
          titulo="Todavía no hay colaboradores"
          detalle="Creá el primero y su foto aparecerá como ícono en horarios, vidas y cumpleaños."
        />
      ) : (
        <ul className="space-y-3">
          {activos.map((c) => (
            <Fila key={c.id} colaborador={c} />
          ))}
        </ul>
      )}

      {verInactivos && inactivos.length > 0 && (
        <ul className="space-y-3 border-t border-borde pt-4">
          {inactivos.map((c) => (
            <Fila key={c.id} colaborador={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
