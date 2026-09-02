"use server";

import { revalidatePath } from "next/cache";
import type { DiaSemana } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { CLAVES_DIA, DIAS, validarDia, type BloqueSimple } from "@/lib/horarios";

export type EstadoHorario = { error?: string; ok?: boolean };

/** Forma del snapshot que se guarda en ScheduleHistory. */
type Snapshot = { diaSemana: DiaSemana; inicio: number; fin: number }[];

function aSnapshot(bloques: BloqueSimple[]): Snapshot {
  return CLAVES_DIA.flatMap((dia) =>
    bloques
      .filter((b) => b.diaSemana === dia)
      .sort((a, b) => a.horaInicioMin - b.horaInicioMin)
      .map((b) => ({
        diaSemana: dia,
        inicio: b.horaInicioMin,
        fin: b.horaFinMin,
      })),
  );
}

function sonIguales(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Reemplaza el horario completo del colaborador.
 *
 * ScheduleBlock guarda siempre el horario vigente, no versiones: la versión
 * anterior queda como snapshot en ScheduleHistory. Por eso el guardado borra
 * los bloques y los vuelve a crear, todo dentro de una transacción para que no
 * pueda quedar a medias.
 */
export async function guardarHorario(
  _previo: EstadoHorario,
  datos: FormData,
): Promise<EstadoHorario> {
  await exigirAdmin();

  const colaboradorId = String(datos.get("colaboradorId") ?? "");
  if (!colaboradorId) return { error: "Falta indicar el colaborador." };

  const crudo = String(datos.get("bloques") ?? "[]");
  let bloques: BloqueSimple[];
  try {
    bloques = JSON.parse(crudo);
  } catch {
    return { error: "No se pudo leer el horario. Volvé a intentarlo." };
  }
  if (!Array.isArray(bloques)) return { error: "El horario no es válido." };
  if (bloques.length > 60) return { error: "Demasiados bloques en la semana." };

  // Validación en el servidor, no solo en el editor: la acción es un punto de
  // entrada público.
  for (const b of bloques) {
    if (
      !CLAVES_DIA.includes(b.diaSemana) ||
      !Number.isInteger(b.horaInicioMin) ||
      !Number.isInteger(b.horaFinMin) ||
      b.horaInicioMin < 0 ||
      b.horaFinMin > 24 * 60
    ) {
      return { error: "Hay un bloque con datos inválidos." };
    }
  }

  for (const dia of DIAS) {
    const delDia = bloques.filter((b) => b.diaSemana === dia.clave);
    const error = validarDia(delDia, dia.etiqueta);
    if (error) return { error };
  }

  const anteriores = await prisma.scheduleBlock.findMany({
    where: { colaboradorId },
    select: { diaSemana: true, horaInicioMin: true, horaFinMin: true },
  });

  const snapshotAnterior = aSnapshot(anteriores);
  const snapshotNuevo = aSnapshot(bloques);

  // Sin cambios reales no se ensucia el historial con una entrada vacía.
  if (sonIguales(snapshotAnterior, snapshotNuevo)) return { ok: true };

  await prisma.$transaction([
    prisma.scheduleBlock.deleteMany({ where: { colaboradorId } }),
    prisma.scheduleBlock.createMany({
      data: bloques.map((b) => ({
        colaboradorId,
        diaSemana: b.diaSemana,
        horaInicioMin: b.horaInicioMin,
        horaFinMin: b.horaFinMin,
      })),
    }),
    prisma.scheduleHistory.create({
      data: {
        colaboradorId,
        horarioAnterior: snapshotAnterior,
        horarioNuevo: snapshotNuevo,
      },
    }),
  ]);

  revalidatePath("/horarios");
  return { ok: true };
}
