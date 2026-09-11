"use server";

import { redirect } from "next/navigation";
import { claveEsValida, iniciarSesionAdmin } from "@/lib/auth";

export type EstadoIngreso = { error?: string };

export async function ingresar(
  _estadoPrevio: EstadoIngreso,
  datos: FormData,
): Promise<EstadoIngreso> {
  const clave = String(datos.get("clave") ?? "");

  if (!clave) return { error: "Escribe la clave para continuar." };
  if (!claveEsValida(clave)) return { error: "La clave no es correcta." };

  await iniciarSesionAdmin();
  redirect("/");
}
