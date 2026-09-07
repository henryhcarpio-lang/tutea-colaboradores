import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion, EstadoVacio } from "@/components/seccion";
import { leerSnapshot } from "@/lib/historial";
import { urlFoto } from "@/lib/foto";
import { ListaHistorial, type HistorialColaborador } from "./lista-historial";

export const metadata = { title: "Historial de horarios" };

export default async function Historial() {
  // Sin restricción de admin: el historial son horarios, el mismo dato público
  // que la cuadrícula. No hay nada sensible que ocultar.
  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      actualizadoEn: true,
      historial: {
        orderBy: { fechaCambio: "desc" },
        select: { id: true, fechaCambio: true, horarioAnterior: true, horarioNuevo: true },
      },
    },
  });

  const historiales: HistorialColaborador[] = colaboradores.map(
    ({ historial, actualizadoEn, foto, id, ...resto }) => ({
      colaborador: { id, foto: urlFoto(id, foto, actualizadoEn), ...resto },
      cambios: historial.map((h) => ({
        id: h.id,
        fechaCambio: h.fechaCambio.toISOString(),
        anterior: leerSnapshot(h.horarioAnterior),
        nuevo: leerSnapshot(h.horarioNuevo),
      })),
    }),
  );

  return (
    <>
      <EncabezadoSeccion
        titulo="Historial de horarios"
        descripcion="Cada cambio guardado, con su fecha y el horario que había antes."
        acciones={
          <Link
            href="/horarios"
            className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
          >
            Volver a la cuadrícula
          </Link>
        }
      />

      {historiales.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay colaboradores"
          detalle="El historial se arma solo a medida que se van guardando horarios."
        />
      ) : (
        <ListaHistorial historiales={historiales} />
      )}
    </>
  );
}
