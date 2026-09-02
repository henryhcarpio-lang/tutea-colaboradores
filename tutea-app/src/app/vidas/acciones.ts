"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { hoyEnLima } from "@/lib/fecha";
import { reiniciarMesActual } from "@/lib/vidas";

export type EstadoVida = { error?: string; ok?: boolean };

function refrescar() {
  revalidatePath("/vidas");
  revalidatePath("/vidas/historial");
}

export async function usarVida(
  _previo: EstadoVida,
  datos: FormData,
): Promise<EstadoVida> {
  await exigirAdmin();

  const periodoId = String(datos.get("periodoId") ?? "");
  const motivo = String(datos.get("motivo") ?? "").trim();
  const fechaTexto = String(datos.get("fecha") ?? "");

  if (!periodoId) return { error: "Falta el período." };
  if (motivo.length < 3) return { error: "Escribí el motivo del permiso." };
  if (motivo.length > 200) return { error: "El motivo es demasiado largo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    return { error: "Elegí la fecha del permiso." };
  }

  const fecha = new Date(`${fechaTexto}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime())) return { error: "La fecha no es válida." };

  const periodo = await prisma.lifeMonthlyPeriod.findUnique({
    where: { id: periodoId },
    select: { id: true, colaboradorId: true, cerradoEn: true },
  });
  if (!periodo) return { error: "No se encontró el período." };
  if (periodo.cerradoEn) {
    return { error: "Ese mes ya está cerrado: no se le pueden sumar permisos." };
  }

  // Si no queda cupo se registra igual y se marca como excedido (§3.5): dejar
  // sin registrar un permiso que la persona efectivamente se tomó es peor para
  // gerencia que verlo en rojo.
  await prisma.lifeUsage.create({
    data: {
      colaboradorId: periodo.colaboradorId,
      periodoId: periodo.id,
      fecha,
      motivo,
    },
  });

  refrescar();
  return { ok: true };
}

export async function anularUso(id: string): Promise<void> {
  await exigirAdmin();
  await prisma.lifeUsage.delete({ where: { id } });
  refrescar();
}

/** Ajuste manual del cupo del mes en curso. No toca el default del colaborador. */
export async function ajustarCupo(
  periodoId: string,
  delta: number,
): Promise<void> {
  await exigirAdmin();

  const periodo = await prisma.lifeMonthlyPeriod.findUnique({
    where: { id: periodoId },
    select: { vidasAsignadas: true, cerradoEn: true },
  });
  if (!periodo || periodo.cerradoEn) return;

  const nuevo = Math.min(10, Math.max(0, periodo.vidasAsignadas + delta));
  if (nuevo === periodo.vidasAsignadas) return;

  await prisma.lifeMonthlyPeriod.update({
    where: { id: periodoId },
    data: { vidasAsignadas: nuevo },
  });
  refrescar();
}

export async function reiniciarMes(): Promise<void> {
  await exigirAdmin();
  await reiniciarMesActual();
  refrescar();
}

/** Fecha de hoy en Lima, para el valor inicial del formulario. */
export async function fechaDeHoy(): Promise<string> {
  return hoyEnLima().toISOString().slice(0, 10);
}
