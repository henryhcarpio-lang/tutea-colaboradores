"use client";

import { useActionState } from "react";
import { ingresar, type EstadoIngreso } from "./acciones";

const ESTADO_INICIAL: EstadoIngreso = {};

export function FormularioIngreso() {
  const [estado, accion, pendiente] = useActionState(ingresar, ESTADO_INICIAL);

  return (
    <form action={accion} className="mt-8 space-y-4">
      <div>
        <label htmlFor="clave" className="text-sm font-medium">
          Clave de administrador
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="mt-2 w-full rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15"
        />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-xl bg-acento px-4 py-2.5 text-sm font-medium text-white hover:bg-acento/90 disabled:opacity-60"
      >
        {pendiente ? "Verificando…" : "Ingresar"}
      </button>
    </form>
  );
}
