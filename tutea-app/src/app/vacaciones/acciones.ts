"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { hoyEnLima } from "@/lib/fecha";

export type EstadoVacacion = { error?: string; ok?: boolean };

function refrescar() {
  revalidatePath("/vacaciones");
}

export async function registrarVacacion(
  _previo: EstadoVacacion,
  datos: FormData,
): Promise<EstadoVacacion> {
  await exigirAdmin();

  const periodoId = String(datos.get("periodoId") ?? "");
  const inicioTexto = String(datos.get("fechaInicio") ?? "");
  const finTexto = String(datos.get("fechaFin") ?? "");
  const diasTexto = String(datos.get("dias") ?? "");
  const observacion = String(datos.get("observacion") ?? "").trim();

  if (!periodoId) return { error: "Falta el período." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicioTexto)) {
    return { error: "Elegí la fecha de inicio." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(finTexto)) {
    return { error: "Elegí la fecha de fin." };
  }
  const fechaInicio = new Date(`${inicioTexto}T00:00:00.000Z`);
  const fechaFin = new Date(`${finTexto}T00:00:00.000Z`);
  if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
    return { error: "Las fechas no son válidas." };
  }
  if (fechaFin < fechaInicio) {
    return { error: "La fecha de fin no puede ser anterior a la de inicio." };
  }

  const dias = Number(diasTexto);
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    return { error: "Los días tienen que ser un número entero mayor a 0." };
  }
  if (observacion.length > 300) return { error: "La observación es demasiado larga." };

  const periodo = await prisma.vacationPeriod.findUnique({
    where: { id: periodoId },
    select: { id: true, colaboradorId: true, cerradoEn: true },
  });
  if (!periodo) return { error: "No se encontró el período." };
  if (periodo.cerradoEn) {
    return { error: "Ese año de servicio ya está cerrado: no se le pueden sumar goces." };
  }

  // Igual que un uso de Vidas: si no queda cupo se registra igual y se marca
  // como excedente al presentarlo; nunca se bloquea el registro.
  await prisma.vacationUsage.create({
    data: {
      colaboradorId: periodo.colaboradorId,
      periodoId: periodo.id,
      fechaInicio,
      fechaFin,
      dias,
      observacion: observacion || null,
    },
  });

  refrescar();
  return { ok: true };
}

export async function anularVacacion(id: string): Promise<void> {
  await exigirAdmin();
  await prisma.vacationUsage.delete({ where: { id } });
  refrescar();
}

/** Ajuste manual del cupo del año en curso. No toca el default del colaborador. */
export async function ajustarDiasAsignados(
  periodoId: string,
  delta: number,
): Promise<void> {
  await exigirAdmin();

  const periodo = await prisma.vacationPeriod.findUnique({
    where: { id: periodoId },
    select: { diasAsignados: true, cerradoEn: true },
  });
  if (!periodo || periodo.cerradoEn) return;

  const nuevo = Math.min(60, Math.max(0, periodo.diasAsignados + delta));
  if (nuevo === periodo.diasAsignados) return;

  await prisma.vacationPeriod.update({
    where: { id: periodoId },
    data: { diasAsignados: nuevo },
  });
  refrescar();
}

/** Fecha de hoy en Lima, para el valor inicial del formulario. */
export async function fechaDeHoy(): Promise<string> {
  return hoyEnLima().toISOString().slice(0, 10);
}
