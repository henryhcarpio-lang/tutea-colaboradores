import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion, EstadoVacio } from "@/components/seccion";
import { urlFoto } from "@/lib/foto";
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
      actualizadoEn: true,
      bloques: {
        select: { diaSemana: true, horaInicioMin: true, horaFinMin: true },
      },
    },
  });

  // Acá es donde más importa: la misma persona aparece una vez por cada
  // bloque de su semana, así que su foto en base64 se repetía tantas veces
  // como bloques tuviera. Con una URL corta en vez del data URL inline, el
  // peso de la página deja de multiplicarse por la cantidad de bloques.
  const filas: FilaHorario[] = colaboradores.map(
    ({ bloques, actualizadoEn, foto, id, ...resto }) => ({
      colaborador: { id, foto: urlFoto(id, foto, actualizadoEn), ...resto },
      bloques,
    }),
  );

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
