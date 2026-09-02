import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion, EstadoVacio } from "@/components/seccion";
import { Cuadricula, type FilaHorario } from "./cuadricula";

export const metadata = { title: "Horarios" };

export default async function Horarios() {
  const admin = await esAdmin();

  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      bloques: {
        select: { diaSemana: true, horaInicioMin: true, horaFinMin: true },
      },
    },
  });

  const filas: FilaHorario[] = colaboradores.map(({ bloques, ...colaborador }) => ({
    colaborador,
    bloques,
  }));

  return (
    <>
      <EncabezadoSeccion
        titulo="Horarios"
        descripcion="Cuadrícula semanal del equipo, de lunes a sábado, con filtros por área y por colaborador."
        acciones={
          <Link
            href="/horarios/historial"
            className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
          >
            Ver historial
          </Link>
        }
      />

      {filas.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay colaboradores"
          detalle="La cuadrícula aparecerá acá una vez que existan personas cargadas en el equipo."
        />
      ) : (
        <Cuadricula filas={filas} admin={admin} />
      )}
    </>
  );
}
