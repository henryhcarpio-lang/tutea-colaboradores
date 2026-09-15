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
 * la persona que se tocó (`sincronizarPeriodoContrato`, de a una), así que
 * esto existe para lo que no pasa por una acción: que el contrato de alguien
 * venza con el correr de los días, o que a alguien lo den de baja. Sin cron,
 * igual que `asegurarPeriodos()` de Vidas: corre al entrar al módulo, y es
 * idempotente.
 *
 * A propósito NO reutiliza `sincronizarPeriodoContrato` en un `for`: llamarla
 * una vez por persona son dos o tres consultas cada vez, y con el equipo
 * completo eso eran decenas de idas y vueltas a la base en cada carga de
 * /vacaciones —la causa real de la lentitud reportada—. Acá se trae todo en
 * dos consultas, se decide en memoria quién necesita qué, y se aplica en una
 * sola transacción sin importar cuánta gente haya.
 *
 * El cupo con el que abriría un período nuevo sale de la duración del
 * contrato; un cupo ajustado a mano no se pisa, porque un contrato que ya
 * tiene su período abierto no se vuelve a crear, solo se corrige el número
 * si quedó desalineado.
 */
export async function asegurarPeriodosVacacion(): Promise<void> {
  const hoy = hoyEnLima();

  const [colaboradores, abiertos] = await Promise.all([
    prisma.collaborator.findMany({
      select: {
        id: true,
        activo: true,
        fechaInicioContrato: true,
        fechaFinContrato: true,
      },
    }),
    prisma.vacationPeriod.findMany({
      where: { cerradoEn: null },
      select: { id: true, colaboradorId: true, desde: true, hasta: true, diasAsignados: true },
    }),
  ]);

  const abiertoDe = new Map(abiertos.map((p) => [p.colaboradorId, p]));

  const aCerrar: string[] = [];
  const aCrear: { colaboradorId: string; desde: Date; hasta: Date; diasAsignados: number }[] = [];
  const aCorregirCupo: { id: string; diasAsignados: number }[] = [];

  for (const c of colaboradores) {
    // A quien está de baja se le cierra el período aunque su ficha siga
    // teniendo fechas de contrato.
    const inicio = c.activo ? c.fechaInicioContrato : null;
    const fin = c.activo ? c.fechaFinContrato : null;
    const hayContrato = Boolean(inicio && fin);
    const diasAsignados = inicio && fin ? diasPorDuracionDeContrato(inicio, fin) : 0;
    const vigente = abiertoDe.get(c.id);

    const mismoContrato =
      vigente &&
      hayContrato &&
      vigente.desde.getTime() === inicio!.getTime() &&
      vigente.hasta.getTime() === fin!.getTime();

    if (mismoContrato) {
      if (vigente!.diasAsignados !== diasAsignados) {
        aCorregirCupo.push({ id: vigente!.id, diasAsignados });
      }
      continue;
    }

    if (vigente) aCerrar.push(vigente.id);

    const abrirNuevo = hayContrato && fin! >= hoy;
    if (abrirNuevo) {
      aCrear.push({ colaboradorId: c.id, desde: inicio!, hasta: fin!, diasAsignados });
    }
  }

  if (aCerrar.length === 0 && aCrear.length === 0 && aCorregirCupo.length === 0) return;

  await prisma.$transaction([
    ...(aCerrar.length > 0
      ? [prisma.vacationPeriod.updateMany({ where: { id: { in: aCerrar } }, data: { cerradoEn: new Date() } })]
      : []),
    ...(aCrear.length > 0 ? [prisma.vacationPeriod.createMany({ data: aCrear })] : []),
    ...aCorregirCupo.map((u) =>
      prisma.vacationPeriod.update({ where: { id: u.id }, data: { diasAsignados: u.diasAsignados } }),
    ),
  ]);
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
