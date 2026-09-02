import "server-only";
import { prisma } from "./prisma";
import { mesPeriodoActual } from "./fecha";

/**
 * Cierra los períodos que quedaron abiertos en meses anteriores y abre el del
 * mes corriente para cada colaborador activo.
 *
 * No hay cron ni proceso en segundo plano: esto corre al entrar al módulo de
 * Vidas (§3.6 del spec). Así funciona igual en local que en producción, y no
 * depende de que alguien entre justo el día 1.
 *
 * Es idempotente: llamarla dos veces seguidas no cambia nada.
 */
export async function asegurarPeriodos(mes = mesPeriodoActual()): Promise<void> {
  const activos = await prisma.collaborator.findMany({
    where: { activo: true },
    select: { id: true, vidasMensualesDefault: true },
  });
  if (activos.length === 0) return;

  const abiertos = await prisma.lifeMonthlyPeriod.findMany({
    where: { cerradoEn: null },
    select: { id: true, colaboradorId: true, mesPeriodo: true },
  });

  // Los de meses pasados se archivan tal como quedaron: el período cerrado,
  // con sus usos, ES la foto del mes que terminó.
  const aCerrar = abiertos.filter((p) => p.mesPeriodo !== mes).map((p) => p.id);
  const conPeriodoVigente = new Set(
    abiertos.filter((p) => p.mesPeriodo === mes).map((p) => p.colaboradorId),
  );
  const faltantes = activos.filter((c) => !conPeriodoVigente.has(c.id));

  if (aCerrar.length === 0 && faltantes.length === 0) return;

  await prisma.$transaction([
    prisma.lifeMonthlyPeriod.updateMany({
      where: { id: { in: aCerrar } },
      data: { cerradoEn: new Date() },
    }),
    prisma.lifeMonthlyPeriod.createMany({
      data: faltantes.map((c) => ({
        colaboradorId: c.id,
        mesPeriodo: mes,
        vidasAsignadas: c.vidasMensualesDefault,
      })),
    }),
  ]);
}

/**
 * Reinicio manual: archiva el período vigente —que conserva sus usos y queda
 * en el historial— y abre uno nuevo del mismo mes con el cupo por defecto.
 * No se borra nada.
 */
export async function reiniciarMesActual(): Promise<void> {
  const mes = mesPeriodoActual();

  const vigentes = await prisma.lifeMonthlyPeriod.findMany({
    where: { cerradoEn: null },
    select: {
      id: true,
      colaboradorId: true,
      colaborador: { select: { vidasMensualesDefault: true } },
    },
  });
  if (vigentes.length === 0) return;

  await prisma.$transaction([
    prisma.lifeMonthlyPeriod.updateMany({
      where: { id: { in: vigentes.map((p) => p.id) } },
      data: { cerradoEn: new Date() },
    }),
    prisma.lifeMonthlyPeriod.createMany({
      data: vigentes.map((p) => ({
        colaboradorId: p.colaboradorId,
        mesPeriodo: mes,
        vidasAsignadas: p.colaborador.vidasMensualesDefault,
      })),
    }),
  ]);
}
