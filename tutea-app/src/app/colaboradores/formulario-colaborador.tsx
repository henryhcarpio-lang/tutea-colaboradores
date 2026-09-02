"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Area, Collaborator } from "@prisma/client";
import { AREAS, LISTA_AREAS } from "@/lib/areas";
import { redimensionarACuadrado } from "@/lib/imagen";
import { Avatar } from "@/components/avatar";
import {
  crearColaborador,
  editarColaborador,
  type EstadoColaborador,
} from "./acciones";

const ESTADO_INICIAL: EstadoColaborador = {};

const CLASE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

function aISO(fecha: Date): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

export function FormularioColaborador({
  colaborador,
  onCerrar,
}: {
  colaborador?: Collaborator;
  onCerrar: () => void;
}) {
  const editando = Boolean(colaborador);
  const [estado, accion, pendiente] = useActionState(
    editando ? editarColaborador : crearColaborador,
    ESTADO_INICIAL,
  );

  const [nombre, setNombre] = useState(colaborador?.nombre ?? "");
  const [area, setArea] = useState<Area>(colaborador?.area ?? "operativo");
  const [foto, setFoto] = useState<string | null>(colaborador?.foto ?? null);
  const [vidas, setVidas] = useState(
    String(colaborador?.vidasMensualesDefault ?? 2),
  );
  const [nacimiento, setNacimiento] = useState(
    colaborador ? aISO(colaborador.fechaNacimiento) : "",
  );
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  async function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    setErrorFoto(null);
    if (!archivo.type.startsWith("image/")) {
      setErrorFoto("Elegí un archivo de imagen.");
      return;
    }
    try {
      setFoto(await redimensionarACuadrado(archivo));
      setQuitarFoto(false);
    } catch {
      setErrorFoto("No se pudo leer esa imagen. Probá con otra.");
    }
  }

  return (
    <form
      action={accion}
      className="aparecer rounded-2xl border border-borde bg-superficie p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight">
        {editando ? `Editar a ${colaborador!.nombre}` : "Nuevo colaborador"}
      </h2>

      {editando && <input type="hidden" name="id" value={colaborador!.id} />}
      <input type="hidden" name="foto" value={foto ?? ""} />
      <input type="hidden" name="quitarFoto" value={quitarFoto ? "1" : "0"} />

      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        {/* Foto */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <Avatar
            nombre={nombre || "?"}
            foto={quitarFoto ? null : foto}
            area={area}
            tamano="lg"
          />
          <input
            ref={inputArchivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => elegirFoto(e.target.files?.[0])}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputArchivo.current?.click()}
              className="rounded-lg border border-borde px-2.5 py-1 text-xs hover:bg-fondo"
            >
              {foto && !quitarFoto ? "Cambiar" : "Subir foto"}
            </button>
            {foto && !quitarFoto && (
              <button
                type="button"
                onClick={() => {
                  setQuitarFoto(true);
                  setFoto(null);
                }}
                className="rounded-lg px-2 py-1 text-xs text-texto-suave hover:text-peligro"
              >
                Quitar
              </button>
            )}
          </div>
          {errorFoto && <p className="text-xs text-peligro">{errorFoto}</p>}
        </div>

        {/* Campos */}
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nombre" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={80}
              autoFocus
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label htmlFor="area" className="text-sm font-medium">
              Área
            </label>
            <select
              id="area"
              name="area"
              value={area}
              onChange={(e) => setArea(e.target.value as Area)}
              className={CLASE_CAMPO}
            >
              {LISTA_AREAS.map((clave) => (
                <option key={clave} value={clave}>
                  {AREAS[clave].etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vidas" className="text-sm font-medium">
              Vidas por mes
            </label>
            <input
              id="vidas"
              name="vidasMensualesDefault"
              type="number"
              min={0}
              max={10}
              value={vidas}
              onChange={(e) => setVidas(e.target.value)}
              className={CLASE_CAMPO}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="nacimiento" className="text-sm font-medium">
              Fecha de nacimiento
            </label>
            <input
              id="nacimiento"
              name="fechaNacimiento"
              type="date"
              value={nacimiento}
              onChange={(e) => setNacimiento(e.target.value)}
              className={CLASE_CAMPO}
            />
            <p className="mt-1.5 text-xs text-texto-suave">
              Día, mes y año. El día se usa para avisar del cumpleaños.
            </p>
          </div>
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="mt-5 text-sm text-peligro">
          {estado.error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte disabled:opacity-60"
        >
          {pendiente
            ? "Guardando…"
            : editando
              ? "Guardar cambios"
              : "Crear colaborador"}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-xl px-3 py-2.5 text-sm text-texto-suave hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
