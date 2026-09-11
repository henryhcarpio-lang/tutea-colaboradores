import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion } from "@/components/seccion";
import { ListaColaboradores } from "./lista-colaboradores";

export const metadata = { title: "Colaboradores" };

export default async function Colaboradores() {
  // Única sección con acceso restringido: el resto del sistema es público.
  if (!(await esAdmin())) redirect("/ingresar");

  const filas = await prisma.collaborator.findMany({
    orderBy: { nombre: "asc" },
    include: {
      // El cupo de vacaciones vive en el período del contrato vigente, no en
      // la fila del colaborador: se trae para poder editarlo desde su ficha.
      periodosVacacion: {
        where: { cerradoEn: null },
        take: 1,
        select: { diasAsignados: true },
      },
    },
  });

  const todos = filas.map(({ periodosVacacion, ...colaborador }) => ({
    ...colaborador,
    diasVacacionesActuales: periodosVacacion[0]?.diasAsignados ?? null,
  }));

  return (
    <>
      <EncabezadoSeccion
        titulo="Colaboradores"
        descripcion="Alta, edición y baja de las personas del equipo. Todo lo demás depende de esta sección."
      />
      <ListaColaboradores
        activos={todos.filter((c) => c.activo)}
        inactivos={todos.filter((c) => !c.activo)}
      />
    </>
  );
}
