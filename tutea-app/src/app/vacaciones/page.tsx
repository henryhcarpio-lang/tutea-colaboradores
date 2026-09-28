import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  asegurarPeriodosVacacion,
  colaboradoresConContratoPorVencer,
} from "@/lib/vacaciones-servidor";
import { EncabezadoSeccion } from "@/components/seccion";
import { hoyEnLima } from "@/lib/fecha";
import { cuentaRegresiva } from "@/lib/cumpleanos";
import { urlFoto } from "@/lib/foto";
import { PanelVacaciones, type FilaVacaciones } from "./panel-vacaciones";

export const metadata = { title: "Vacaciones" };

export default async function Vacaciones() {
  const admin = await esAdmin();

  // Igual que Vidas: sin cron, el corte se hace perezosamente al entrar al
  // módulo, comparando el contrato declarado contra el período abierto.
  await asegurarPeriodosVacacion();

  const hoy = hoyEnLima();

  // Quién está de vacaciones hoy: algún goce que empezó y todavía no terminó.
  // Una sola consulta para todo el equipo, sin importar a qué contrato
  // pertenezca el goce. Si alguien tiene dos goces que se pisan, vale el que
  // termina más tarde.
  const [porVencer, goceDeHoy] = await Promise.all([
    admin ? colaboradoresConContratoPorVencer() : Promise.resolve([]),
    prisma.vacationUsage.findMany({
      where: { fechaInicio: { lte: hoy }, fechaFin: { gte: hoy } },
      select: { colaboradorId: true, fechaFin: true },
    }),
  ]);
  const vuelveDe = new Map<string, Date>();
  for (const g of goceDeHoy) {
    const previo = vuelveDe.get(g.colaboradorId);
    if (!previo || g.fechaFin > previo) vuelveDe.set(g.colaboradorId, g.fechaFin);
  }

  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      actualizadoEn: true,
      fechaInicioContrato: true,
      fechaFinContrato: true,
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
    (
      {
        periodosVacacion,
        fechaInicioContrato,
        fechaFinContrato,
        actualizadoEn,
        foto,
        id,
        ...resto
      },
    ) => {
      // Si más adelante se borra alguna de las dos fechas de contrato, un
      // período que había quedado abierto no debe seguir mostrándose como
      // vigente: sin las dos fechas no hay de dónde sacar el cupo.
      const tieneContrato = Boolean(fechaInicioContrato && fechaFinContrato);
      const p = tieneContrato ? (periodosVacacion[0] ?? null) : null;
      // Sin período, hay dos motivos bien distintos: no cargaron ninguna
      // fecha todavía, o sí las cargaron pero el contrato ya venció y nadie
      // renovó uno nuevo. El mensaje que ve gerencia depende de cuál es.
      const motivoSinPeriodo = tieneContrato
        ? ("vencido" as const)
        : ("sin_contrato" as const);
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
        motivoSinPeriodo: p ? null : motivoSinPeriodo,
        vacacionesHasta: vuelveDe.get(id)?.toISOString() ?? null,
      };
    },
  );

  return (
    <>
      <EncabezadoSeccion
        titulo="Vacaciones"
        descripcion={
          admin
            ? "Días de cada colaborador en su contrato actual: cuántos tiene, cuántos usó y qué fechas tomó."
            : "Quién está de vacaciones hoy."
        }
        acciones={
          admin && (
            <Link
              href="/vacaciones/historial"
              className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
            >
              Ver contratos anteriores
            </Link>
          )
        }
      />

      {porVencer.length > 0 && (
        <section className="aparecer mb-8 rounded-2xl border border-peligro/25 bg-peligro-suave p-5">
          <h2 className="text-sm font-semibold text-peligro">
            {porVencer.length === 1
              ? "1 contrato vence este mes"
              : `${porVencer.length} contratos vencen este mes`}
          </h2>
          <ul className="mt-3 space-y-2">
            {porVencer.map((c) => {
              const faltan = Math.round(
                (new Date(c.fechaFinContrato).getTime() - hoy.getTime()) /
                  (24 * 60 * 60 * 1000),
              );
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{c.nombre}</span>
                  <span className="text-xs font-semibold text-peligro">
                    vence {cuentaRegresiva(faltan)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-texto-suave">
            Carga el contrato nuevo en la ficha de cada persona para que su cupo
            siga abierto sin cortes.
          </p>
        </section>
      )}

      <PanelVacaciones
        filas={filas}
        admin={admin}
        hoy={hoy.toISOString().slice(0, 10)}
      />
    </>
  );
}
