import type { ReactNode } from "react";

export function EncabezadoSeccion({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-suave">{descripcion}</p>
      </div>
      {acciones}
    </div>
  );
}

/** Sección sin datos que mostrar. */
export function EstadoVacio({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="aparecer rounded-2xl border border-dashed border-borde bg-superficie/60 px-8 py-16 text-center">
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-texto-suave">{detalle}</p>
    </div>
  );
}
