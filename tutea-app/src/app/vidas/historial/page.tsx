import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion, EstadoVacio } from "@/components/seccion";
import { etiquetaMesPeriodo } from "@/lib/fecha";
import { ListaCierres, type CierreColaborador } from "./lista-cierres";

export const metadata = { title: "Historial de vidas" };

export default async function HistorialVidas() {
  const admin = await esAdmin();

  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      periodos: {
        where: { cerradoEn: { not: null } },
        orderBy: { cerradoEn: "desc" },
        select: {
          id: true,
          mesPeriodo: true,
          vidasAsignadas: true,
          cerradoEn: true,
          usos: {
            orderBy: { fecha: "asc" },
            select: { id: true, fecha: true, motivo: true, tipo: true },
          },
        },
      },
    },
  });

  const historiales: CierreColaborador[] = colaboradores.map(
    ({ periodos, ...colaborador }) => ({
      colaborador,
      cierres: periodos.map((p) => ({
        id: p.id,
        mes: etiquetaMesPeriodo(p.mesPeriodo),
        vidasAsignadas: p.vidasAsignadas,
        cerradoEn: p.cerradoEn!.toISOString(),
        usos: p.usos.map((u) => ({
          id: u.id,
          fecha: u.fecha.toISOString(),
          tipo: u.tipo,
          motivo: admin ? u.motivo : null,
        })),
      })),
    }),
  );

  const hayCierres = historiales.some((h) => h.cierres.length > 0);

  return (
    <>
      <EncabezadoSeccion
        titulo="Historial de vidas"
        descripcion="Los meses ya cerrados, con el cupo que tuvo cada persona y los permisos que usó."
        acciones={
          <Link
            href="/vidas"
            className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
          >
            Volver al mes actual
          </Link>
        }
      />

      {!hayCierres ? (
        <EstadoVacio
          titulo="Todavía no se cerró ningún mes"
          detalle="El primer cierre se archiva solo al empezar el mes siguiente, o al usar el botón de reinicio."
        />
      ) : (
        <ListaCierres historiales={historiales} />
      )}
    </>
  );
}
