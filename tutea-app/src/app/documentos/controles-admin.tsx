"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { CategoriaDocumento } from "@prisma/client";
import { Check, FileUp, Trash2, X } from "lucide-react";
import {
  ACEPTA,
  LISTA_CATEGORIAS,
  TAMANO_MAXIMO_BYTES,
  tamanoLegible,
} from "@/lib/documentos";
import { eliminarDocumento, subirDocumento, type EstadoDocumento } from "./acciones";

const ESTADO_INICIAL: EstadoDocumento = {};

const CLASE_CAMPO =
  "mt-1.5 w-full rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-sm outline-none focus:border-acento focus:ring-2 focus:ring-acento/15";

function Formulario({ onCerrar }: { onCerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState(subirDocumento, ESTADO_INICIAL);
  const [categoria, setCategoria] = useState<CategoriaDocumento>("politica");
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  useEffect(() => {
    if (estado.ok) onCerrar();
  }, [estado.ok, onCerrar]);

  return (
    <form action={accion} className="aparecer rounded-2xl border border-borde bg-superficie p-6">
      <h2 className="text-lg font-semibold tracking-tight">Subir documento</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="titulo" className="text-sm font-medium">
            Título
          </label>
          <input
            id="titulo"
            name="titulo"
            maxLength={120}
            autoFocus
            placeholder="Reglamento Interno de Trabajo"
            className={CLASE_CAMPO}
          />
        </div>

        <div>
          <label htmlFor="categoria" className="text-sm font-medium">
            Tipo
          </label>
          <select
            id="categoria"
            name="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
            className={CLASE_CAMPO}
          >
            {LISTA_CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c === "politica" ? "Política (se lee en el navegador)" : "Modelo (se descarga)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="archivo" className="text-sm font-medium">
            Archivo
          </label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept={ACEPTA}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              // Se avisa antes de enviar: un archivo demasiado pesado ni
              // siquiera llega a la acción, lo corta el servidor antes.
              setErrorArchivo(
                archivo && archivo.size > TAMANO_MAXIMO_BYTES
                  ? `Pesa ${tamanoLegible(archivo.size)}; el máximo es ${tamanoLegible(TAMANO_MAXIMO_BYTES)}.`
                  : null,
              );
            }}
            className={`${CLASE_CAMPO} file:mr-3 file:rounded-lg file:border-0 file:bg-acento-suave file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-acento`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="descripcion" className="text-sm font-medium">
            Descripción <span className="font-normal text-texto-suave">(opcional)</span>
          </label>
          <input
            id="descripcion"
            name="descripcion"
            maxLength={300}
            placeholder={
              categoria === "politica"
                ? "Versión vigente, actualizada en 2026"
                : "Complétalo y entrégalo a gerencia"
            }
            className={CLASE_CAMPO}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-texto-suave">
        PDF, Word, Excel u ODT, hasta {tamanoLegible(TAMANO_MAXIMO_BYTES)}. Para
        las políticas conviene PDF: se puede leer directo en el navegador.
      </p>

      {(errorArchivo || estado.error) && (
        <p role="alert" className="mt-4 text-sm text-peligro">
          {errorArchivo ?? estado.error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente || Boolean(errorArchivo)}
          className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte disabled:opacity-60"
        >
          {pendiente ? "Subiendo…" : "Subir"}
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

export function SubirDocumento() {
  const [abierto, setAbierto] = useState(false);

  if (abierto) return <Formulario onCerrar={() => setAbierto(false)} />;

  return (
    <button
      type="button"
      onClick={() => setAbierto(true)}
      className="flex items-center gap-2 rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-white hover:bg-acento-fuerte"
    >
      <FileUp aria-hidden size={17} strokeWidth={1.75} />
      Subir documento
    </button>
  );
}

/** Con un paso de confirmación, igual que quitar a un colaborador. */
export function EliminarDocumento({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        title="Eliminar este documento"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-texto-suave hover:bg-peligro-suave hover:text-peligro"
      >
        <Trash2 aria-hidden size={15} strokeWidth={1.75} />
        Eliminar
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => iniciar(() => void eliminarDocumento(id))}
        className="flex items-center gap-1.5 rounded-lg bg-peligro px-2.5 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        <Check aria-hidden size={15} strokeWidth={2} />
        {pendiente ? "Eliminando…" : "Confirmar"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="flex items-center gap-1 px-1.5 text-sm text-texto-suave hover:text-texto"
      >
        <X aria-hidden size={15} strokeWidth={1.75} />
        No
      </button>
    </span>
  );
}
