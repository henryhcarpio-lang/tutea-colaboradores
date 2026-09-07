import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asegurarPeriodosVacacion } from "@/lib/vacaciones-servidor";
import { EncabezadoSeccion } from "@/components/seccion";
import { hoyEnLima } from "@/lib/fecha";
import { urlFoto } from "@/lib/foto";
import { PanelVacaciones, type FilaVacaciones } from "./panel-vacaciones";

export const metadata = { title: "Vacaciones" };

export default async function Vacaciones() {
  const admin = await esAdmin();

  // Igual que Vidas: sin cron, el corte de año se hace perezosamente al
  // entrar al módulo.
  await asegurarPeriodosVacacion();

  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      actualizadoEn: true,
      fechaIngreso: true,
      periodosVacacion: {
        where: { cerradoEn: null },
        take: 1,
        select: {
          id: true,
          desde: true,
          hasta: true,
          diasAsignados: true,
          usos: {
            orderBy: { fechaInicio: "asc" },
            select: { id: true, fechaInicio: true, fechaFin: true, dias: true, observacion: true },
          },
        },
      },
    },
  });

  const filas: FilaVacaciones[] = colaboradores.map(
    ({ periodosVacacion, fechaIngreso, actualizadoEn, foto, id, ...resto }) => {
      // Si más adelante se borra la fecha de ingreso, un período que había
      // quedado abierto no debe seguir mostrándose como vigente: sin fecha de
      // ingreso no hay de dónde sacar el próximo aniversario.
      const p = fechaIngreso ? (periodosVacacion[0] ?? null) : null;
      return {
        colaborador: { id, foto: urlFoto(id, foto, actualizadoEn), ...resto },
        periodo: p
          ? {
              id: p.id,
              desde: p.desde.toISOString(),
              hasta: p.hasta.toISOString(),
              diasAsignados: p.diasAsignados,
              usos: p.usos.map((u) => ({
                id: u.id,
                fechaInicio: u.fechaInicio.toISOString(),
                fechaFin: u.fechaFin.toISOString(),
                dias: u.dias,
                observacion: u.observacion,
              })),
            }
          : null,
      };
    },
  );

  return (
    <>
      <EncabezadoSeccion
        titulo="Vacaciones"
        descripcion="Días de cada colaborador en su año de servicio actual: cuántos tiene, cuántos usó y qué fechas tomó."
      />
      <PanelVacaciones
        filas={filas}
        admin={admin}
        hoy={hoyEnLima().toISOString().slice(0, 10)}
      />
    </>
  );
}
