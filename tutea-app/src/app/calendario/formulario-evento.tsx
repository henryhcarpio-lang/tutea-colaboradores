"use client";

import { useActionState, useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { LISTA_ESTADOS_EVENTO, ESTADOS_EVENTO } from "@/lib/estado-evento";
import { aFechaISO } from "@/lib/calendario";
import {
  crearEvento,
  editarEvento,
  eliminarEvento,
  type EstadoFormularioEvento,
} from "./acciones";
import type { Evento } from "./calendario-mensual";

const ESTADO_INICIAL: EstadoFormularioEvento = {};

const CLASE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

export function FormularioEvento({
  evento,
  fechaPorDefecto,
  onCerrar,
}: {
  evento?: Evento;
  fechaPorDefecto: string;
  onCerrar: () => void;
}) {
  const editando = Boolean(evento);
  const [estado, accion, pendiente] = useActionState(
    editando ? editarEvento : crearEvento,
    ESTADO_INICIAL,
  );
  const [eliminando, setEliminando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  return (
    <form
      action={accion}
      className="aparecer mt-4 rounded-2xl border border-borde bg-superficie p-5"
    >
      {editando && <input type="hidden" name="id" value={evento!.id} />}

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {editando ? "Editar evento" : "Nuevo evento"}
        </h3>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-texto-suave hover:text-texto"
        >
          <X aria-hidden size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="titulo" className="text-sm font-medium">
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            defaultValue={evento?.titulo}
            maxLength={120}
            autoFocus
            className={CLASE_CAMPO}
          />
        </div>

        <div>
          <label htmlFor="fecha" className="text-sm font-medium">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={evento ? aFechaISO(evento.fecha) : fechaPorDefecto}
            className={CLASE_CAMPO}
          />
        </div>

        <div>
          <label htmlFor="estado" className="text-sm font-medium">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={evento?.estado ?? "pendiente"}
            className={CLASE_CAMPO}
          >
            {LISTA_ESTADOS_EVENTO.map((e) => (
              <option key={e} value={e}>
                {ESTADOS_EVENTO[e].etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="descripcion" className="text-sm font-medium">
            Descripción{" "}
            <span className="font-normal text-texto-suave">(opcional)</span>
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            defaultValue={evento?.descripcion ?? ""}
            maxLength={500}
            rows={2}
            className={CLASE_CAMPO}
          />
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="mt-4 text-sm text-peligro">
          {estado.error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte disabled:opacity-60"
          >
            {pendiente
              ? "Guardando…"
              : editando
                ? "Guardar cambios"
                : "Crear evento"}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl px-3 py-2.5 text-sm text-texto-suave hover:text-texto"
          >
            Cancelar
          </button>
        </div>

        {editando &&
          (confirmarBorrado ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-texto-suave">¿Eliminar el evento?</span>
              <button
                type="button"
                disabled={eliminando}
                onClick={async () => {
                  setEliminando(true);
                  await eliminarEvento(evento!.id);
                  onCerrar();
                }}
                className="rounded-lg bg-peligro px-3 py-1.5 font-medium text-white disabled:opacity-60"
              >
                {eliminando ? "Eliminando…" : "Sí"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarBorrado(false)}
                className="text-texto-suave hover:text-texto"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="flex items-center gap-1.5 text-sm text-texto-suave hover:text-peligro"
            >
              <Trash2 aria-hidden size={15} strokeWidth={1.75} />
              Eliminar
            </button>
          ))}
      </div>
    </form>
  );
}
