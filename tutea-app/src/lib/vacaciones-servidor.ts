import "server-only";
import { prisma } from "./prisma";
import { hoyEnLima } from "./fecha";
import { diasPorDuracionDeContrato } from "./vacaciones";

/**
 * Sincroniza los períodos de vacaciones con el contrato declarado de cada
 * colaborador activo (`fechaInicioContrato`/`fechaFinContrato`).
 *
 * Tutea recontrata por tramos: cada vez que alguien renueva, gerencia carga
 * las fechas del contrato nuevo en la ficha del colaborador. Acá es donde eso
 * se traduce en períodos de vacaciones:
 *
 * - Sin período abierto todavía → se crea uno para el contrato vigente.
 * - El contrato declarado cambió (fechas distintas a las del período
 *   abierto) → el período viejo se archiva tal como quedó —con todo lo que
 *   usó, es el historial de ese tramo— y se abre uno nuevo para el contrato
 *   nuevo. El cupo sale de `diasPorDuracionDeContrato`, no de un número fijo
 *   por persona: dos contratos de duración distinta dan cupos distintos.
 * - El contrato declarado ya venció (su fecha de fin quedó en el pasado) y
 *   nadie cargó uno nuevo todavía → el período se cierra igual, sin abrir
 *   otro: no hay vacaciones que ofrecer mientras no haya un contrato vigente.
 *
 * Sin cron, igual que `asegurarPeriodos()` de Vidas: corre perezosamente al
 * entrar al módulo, y es idempotente.
 */
export async function asegurarPeriodosVacacion(): Promise<void> {
  const hoy = hoyEnLima();

  const activos = await prisma.collaborator.findMany({
    where: {
      activo: true,
      fechaInicioContrato: { not: null },
      fechaFinContrato: { not: null },
    },
    select: { id: true, fechaInicioContrato: true, fechaFinContrato: true },
  });

  const abiertos = await prisma.vacationPeriod.findMany({
    where: { cerradoEn: null },
    select: { id: true, colaboradorId: true, desde: true, hasta: true },
  });
  const abiertoDe = new Map(abiertos.map((p) => [p.colaboradorId, p]));

  const aCerrar: string[] = [];
  const aCrear: { colaboradorId: string; desde: Date; hasta: Date; diasAsignados: number }[] = [];

  for (const c of activos) {
    const desde = c.fechaInicioContrato!;
    const hasta = c.fechaFinContrato!;
    const vigente = abiertoDe.get(c.id);

    const mismoContrato =
      vigente &&
      vigente.desde.getTime() === desde.getTime() &&
      vigente.hasta.getTime() === hasta.getTime();
    if (mismoContrato) continue;

    if (vigente) aCerrar.push(vigente.id);

    // Si el contrato declarado ya venció y nadie cargó uno nuevo, no se abre
    // reemplazo: solo se archiva el que había.
    if (hasta < hoy) continue;

    aCrear.push({
      colaboradorId: c.id,
      desde,
      hasta,
      diasAsignados: diasPorDuracionDeContrato(desde, hasta),
    });
  }

  // Cierra también el período de quien tenía uno abierto pero ya no declara
  // ambas fechas de contrato (se las borraron, o quedó inactivo).
  const idsConContratoVigente = new Set(activos.map((c) => c.id));
  for (const p of abiertos) {
    if (!idsConContratoVigente.has(p.colaboradorId) && !aCerrar.includes(p.id)) {
      aCerrar.push(p.id);
    }
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
