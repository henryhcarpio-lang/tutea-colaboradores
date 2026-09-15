import { redirect } from "next/navigation";
import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion, EstadoVacio } from "@/components/seccion";
import { urlFoto } from "@/lib/foto";
import { ListaContratos, type ContratoColaborador } from "./lista-contratos";

export const metadata = { title: "Historial de vacaciones" };

export default async function HistorialVacaciones({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string }>;
}) {
  // Igual que Colaboradores: el detalle de contratos y goces de cada persona
  // no es para todo el equipo, solo para quien gestiona las vacaciones.
  if (!(await esAdmin())) redirect("/vacaciones");

  // La ficha del colaborador enlaza aquí con su id, para caer directo en su
  // historial en vez de tener que buscarlo en el selector.
  const { colaborador: colaboradorInicial } = await searchParams;

  const colaboradores = await prisma.collaborator.findMany({
    // A diferencia de la vista actual, aquí se listan también los inactivos:
    // el historial de contratos de alguien que ya no trabaja en Tutea no
    // debería desaparecer.
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      actualizadoEn: true,
      periodosVacacion: {
        where: { cerradoEn: { not: null } },
        orderBy: { desde: "desc" },
        select: {
          id: true,
          desde: true,
          hasta: true,
          diasAsignados: true,
          cerradoEn: true,
          usos: {
            orderBy: { fechaInicio: "asc" },
            select: { id: true, fechaInicio: true, fechaFin: true, dias: true, observacion: true },
          },
        },
      },
    },
  });

  const historiales: ContratoColaborador[] = colaboradores.map(
    ({ periodosVacacion, actualizadoEn, foto, id, ...resto }) => ({
      colaborador: { id, foto: urlFoto(id, foto, actualizadoEn), ...resto },
      contratos: periodosVacacion.map((p) => ({
        id: p.id,
        desde: p.desde.toISOString(),
        hasta: p.hasta.toISOString(),
        diasAsignados: p.diasAsignados,
        cerradoEn: p.cerradoEn!.toISOString(),
        usos: p.usos.map((u) => ({
          id: u.id,
          fechaInicio: u.fechaInicio.toISOString(),
          fechaFin: u.fechaFin.toISOString(),
          dias: u.dias,
          observacion: u.observacion,
        })),
      })),
    }),
  );

  const hayContratos = historiales.some((h) => h.contratos.length > 0);

  return (
    <>
      <EncabezadoSeccion
        titulo="Historial de vacaciones"
        descripcion="Los contratos ya cerrados de cada colaborador, con el cupo que tuvo y los días que usó en cada uno."
        acciones={
          <Link
            href="/vacaciones"
            className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
          >
            Volver al contrato actual
          </Link>
        }
      />

      {!hayContratos ? (
        <EstadoVacio
          titulo="Todavía no hay contratos cerrados"
          detalle="Un contrato se archiva aquí solo cuando se carga uno nuevo con fechas distintas en la ficha del colaborador."
        />
      ) : (
        <ListaContratos
          historiales={historiales}
          colaboradorInicial={colaboradorInicial}
        />
      )}
    </>
  );
}
