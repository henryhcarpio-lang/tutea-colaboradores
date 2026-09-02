import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Autenticación deliberadamente mínima: una sola clave de administrador
// compartida por gerencia, sin gestión de usuarios individuales (§2 del spec).
// La sesión es una cookie httpOnly firmada con HMAC, no un JWT ni una tabla de
// sesiones: no hay nada por usuario que guardar.

const NOMBRE_COOKIE = "tutea_admin";
const DURACION_SESION_S = 60 * 60 * 12; // 12 h: una jornada de trabajo

function secreto(): string {
  const valor = process.env.SESSION_SECRET;
  if (!valor) {
    throw new Error(
      "Falta SESSION_SECRET en las variables de entorno. Copiá .env.example a .env y completalo.",
    );
  }
  return valor;
}

function claveAdmin(): string {
  const valor = process.env.ADMIN_PASSWORD;
  if (!valor) {
    throw new Error(
      "Falta ADMIN_PASSWORD en las variables de entorno. Copiá .env.example a .env y completalo.",
    );
  }
  return valor;
}

function firmar(expiraEn: number): string {
  return createHmac("sha256", secreto()).update(String(expiraEn)).digest("hex");
}

/** Comparación en tiempo constante; evita filtrar la clave por temporización. */
function igualSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function claveEsValida(intento: string): boolean {
  return igualSeguro(intento, claveAdmin());
}

export async function iniciarSesionAdmin(): Promise<void> {
  const expiraEn = Date.now() + DURACION_SESION_S * 1000;
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE, `${expiraEn}.${firmar(expiraEn)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_S,
  });
}

export async function cerrarSesionAdmin(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(NOMBRE_COOKIE);
}

/** Única fuente de verdad sobre si quien mira puede editar. */
export async function esAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get(NOMBRE_COOKIE)?.value;
  if (!cookie) return false;

  const [expiraTexto, firma] = cookie.split(".");
  const expiraEn = Number(expiraTexto);
  if (!expiraTexto || !firma || Number.isNaN(expiraEn)) return false;
  if (expiraEn < Date.now()) return false;

  try {
    return igualSeguro(firma, firmar(expiraEn));
  } catch {
    return false;
  }
}

/** Para usar al principio de toda acción de escritura. */
export async function exigirAdmin(): Promise<void> {
  if (!(await esAdmin())) {
    throw new Error("No autorizado: se requiere sesión de administrador.");
  }
}
