import "server-only";
import { prisma } from "./prisma";
import { hoyEnLima } from "./fecha";
import { diasPorDuracionDeContrato } from "./vacaciones";

/**
 * Pone el período de vacaciones de UNA persona al día con el contrato que
 * declara su ficha. Es el único lugar donde se abren y se cierran períodos:
 * lo llaman tanto el alta/edición de un colaborador (para que el cambio se
 * vea al instante) como el barrido perezoso de abajo.
 *
 * - Mismo contrato que el período abierto → solo se corrige el cupo, por si
 *   gerencia lo ajustó a mano en ese mismo guardado.
 * - Contrato distinto (renovación) → el período viejo se archiva tal como
 *   quedó —con todo lo que usó, es el historial de ese tramo— y se abre uno
 *   nuevo con el cupo que corresponda.
 * - Contrato vencido, o ficha sin las dos fechas → se archiva el que había y
 *   no se abre reemplazo: no hay vacaciones que ofrecer sin contrato vigente.
 */
export async function sincronizarPeriodoContrato(
  colaboradorId: string,
  fechaInicioContrato: Date | null,
  fechaFinContrato: Date | null,
  diasAsignados: number,
): Promise<void> {
  const hoy = hoyEnLima();

  const vigente = await prisma.vacationPeriod.findFirst({
    where: { colaboradorId, cerradoEn: null },
    select: { id: true, desde: true, hasta: true, diasAsignados: true },
  });

  const hayContrato = Boolean(fechaInicioContrato && fechaFinContrato);

  if (
    vigente &&
    hayContrato &&
    vigente.desde.getTime() === fechaInicioContrato!.getTime() &&
    vigente.hasta.getTime() === fechaFinContrato!.getTime()
  ) {
    if (vigente.diasAsignados !== diasAsignados) {
      await prisma.vacationPeriod.update({
        where: { id: vigente.id },
        data: { diasAsignados },
      });
    }
    return;
  }

  const abrirNuevo = hayContrato && fechaFinContrato! >= hoy;
  if (!vigente && !abrirNuevo) return;

  await prisma.$transaction(async (tx) => {
    if (vigente) {
      await tx.vacationPeriod.update({
        where: { id: vigente.id },
        data: { cerradoEn: new Date() },
      });
    }
    if (abrirNuevo) {
      await tx.vacationPeriod.create({
        data: {
          colaboradorId,
          desde: fechaInicioContrato!,
          hasta: fechaFinContrato!,
          diasAsignados,
        },
      });
    }
  });
}

/**
 * Barrido de todos los colaboradores. El alta y la edición ya sincronizan a
 * la persona que se tocó, así que esto existe para lo que no pasa por una
 * acción: que el contrato de alguien venza con el correr de los días, o que
 * a alguien lo den de baja. Sin cron, igual que `asegurarPeriodos()` de
 * Vidas: corre al entrar al módulo, y es idempotente.
 *
 * El cupo con el que abriría un período nuevo sale de la duración del
 * contrato; un cupo ajustado a mano no se pisa, porque un contrato que ya
 * tiene su período abierto no se vuelve a crear.
 */
export async function asegurarPeriodosVacacion(): Promise<void> {
  const colaboradores = await prisma.collaborator.findMany({
    select: {
      id: true,
      activo: true,
      fechaInicioContrato: true,
      fechaFinContrato: true,
    },
  });

  for (const c of colaboradores) {
    // A quien está de baja se le cierra el período aunque su ficha siga
    // teniendo fechas de contrato.
    const inicio = c.activo ? c.fechaInicioContrato : null;
    const fin = c.activo ? c.fechaFinContrato : null;
    await sincronizarPeriodoContrato(
      c.id,
      inicio,
      fin,
      inicio && fin ? diasPorDuracionDeContrato(inicio, fin) : 0,
    );
  }
}

export type ContratoPorVencer = { id: string; nombre: string; fechaFinContrato: string };

/**
 * Quiénes tienen el contrato vigente a menos de `dentroDeDias` de vencer, sin
 * haber vencido todavía. Es el aviso para gerencia: sin cron ni correo, se
 * calcula solo (barato: una consulta directa a `fechaFinContrato`, sin tocar
 * VacationPeriod) cada vez que un admin entra a cualquier página, igual que
 * el saludo de cumpleaños del layout.
 */
export async function colaboradoresConContratoPorVencer(
  dentroDeDias = 30,
): Promise<ContratoPorVencer[]> {
  const hoy = hoyEnLima();
  const limite = new Date(hoy);
  limite.setUTCDate(limite.getUTCDate() + dentroDeDias);

  const colaboradores = await prisma.collaborator.findMany({
    where: {
      activo: true,
      fechaFinContrato: { gte: hoy, lte: limite },
    },
    orderBy: { fechaFinContrato: "asc" },
    select: { id: true, nombre: true, fechaFinContrato: true },
  });

  return colaboradores.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    fechaFinContrato: c.fechaFinContrato!.toISOString(),
  }));
}
