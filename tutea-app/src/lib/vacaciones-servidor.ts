import "server-only";
import { prisma } from "./prisma";
import { hoyEnLima } from "./fecha";
import { ventanaDeServicio } from "./vacaciones";

/**
 * Abre el período de vacaciones vigente para cada colaborador activo que
 * tenga fecha de ingreso, y cierra el que quedó vencido. Igual que
 * `asegurarPeriodos()` de Vidas: sin cron, corre al entrar al módulo, es
 * idempotente.
 *
 * El saldo que quedó sin usar en el período cerrado se pierde: el nuevo abre
 * limpio con `diasVacacionesDefault`, no con el resto del anterior.
 */
export async function asegurarPeriodosVacacion(): Promise<void> {
  const hoy = hoyEnLima();

  const activos = await prisma.collaborator.findMany({
    where: { activo: true, fechaIngreso: { not: null } },
    select: { id: true, fechaIngreso: true, diasVacacionesDefault: true },
  });
  if (activos.length === 0) return;

  const abiertos = await prisma.vacationPeriod.findMany({
    where: { cerradoEn: null },
    select: { id: true, colaboradorId: true, desde: true, hasta: true },
  });
  const abiertoDe = new Map(abiertos.map((p) => [p.colaboradorId, p]));

  const aCerrar: string[] = [];
  const aCrear: { colaboradorId: string; desde: Date; hasta: Date; diasAsignados: number }[] = [];

  for (const c of activos) {
    const ventana = ventanaDeServicio(c.fechaIngreso!, hoy);
    if (!ventana) continue;

    const vigente = abiertoDe.get(c.id);
    if (vigente && vigente.desde.getTime() === ventana.desde.getTime()) {
      continue; // Ya tiene abierto exactamente este año de servicio.
    }
    if (vigente) aCerrar.push(vigente.id);
    aCrear.push({
      colaboradorId: c.id,
      desde: ventana.desde,
      hasta: ventana.hasta,
      diasAsignados: c.diasVacacionesDefault,
    });
  }

  if (aCerrar.length === 0 && aCrear.length === 0) return;

  await prisma.$transaction([
    prisma.vacationPeriod.updateMany({
      where: { id: { in: aCerrar } },
      data: { cerradoEn: new Date() },
    }),
    prisma.vacationPeriod.createMany({ data: aCrear }),
  ]);
}
