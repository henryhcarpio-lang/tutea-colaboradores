"use server";

import { revalidatePath } from "next/cache";
import { EstadoEvento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { LISTA_ESTADOS_EVENTO } from "@/lib/estado-evento";

export type EstadoFormularioEvento = { error?: string; ok?: boolean };

function refrescar() {
  revalidatePath("/calendario");
}

type DatosValidados = {
  titulo: string;
  descripcion: string | null;
  fecha: Date;
  estado: EstadoEvento;
};

/**
 * Valida en el servidor, no solo en el formulario: las acciones son un punto
 * de entrada público y el navegador puede mandar cualquier cosa.
 */
function validar(datos: FormData): DatosValidados | string {
  const titulo = String(datos.get("titulo") ?? "").trim();
  if (titulo.length < 2) return "Ponele un título al evento.";
  if (titulo.length > 120) return "El título es demasiado largo.";

  const fechaTexto = String(datos.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    return "Elige una fecha para el evento.";
  }
  // Se arma en UTC a medianoche para que la columna `date` guarde exactamente
  // el día escrito, sin correrse por zona horaria.
  const fecha = new Date(`${fechaTexto}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime())) return "La fecha no es válida.";

  const estadoTexto = String(datos.get("estado") ?? "pendiente");
  if (!LISTA_ESTADOS_EVENTO.includes(estadoTexto as EstadoEvento)) {
    return "Elige un estado válido.";
  }

  const descripcionCruda = String(datos.get("descripcion") ?? "").trim();
  if (descripcionCruda.length > 500) {
    return "La descripción es demasiado larga.";
  }

  return {
    titulo,
    descripcion: descripcionCruda || null,
    fecha,
    estado: estadoTexto as EstadoEvento,
  };
}

export async function crearEvento(
  _previo: EstadoFormularioEvento,
  datos: FormData,
): Promise<EstadoFormularioEvento> {
  await exigirAdmin();

  const validado = validar(datos);
  if (typeof validado === "string") return { error: validado };

  await prisma.calendarEvent.create({ data: validado });
  refrescar();
  return { ok: true };
}

export async function editarEvento(
  _previo: EstadoFormularioEvento,
  datos: FormData,
): Promise<EstadoFormularioEvento> {
  await exigirAdmin();

  const id = String(datos.get("id") ?? "");
  if (!id) return { error: "Falta identificar el evento." };

  const validado = validar(datos);
  if (typeof validado === "string") return { error: validado };

  await prisma.calendarEvent.update({ where: { id }, data: validado });
  refrescar();
  return { ok: true };
}

export async function eliminarEvento(id: string): Promise<void> {
  await exigirAdmin();
  await prisma.calendarEvent.delete({ where: { id } });
  refrescar();
}
