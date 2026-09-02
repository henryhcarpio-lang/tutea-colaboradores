import { NextResponse } from "next/server";
import { cerrarSesionAdmin } from "@/lib/auth";

export async function POST(peticion: Request) {
  await cerrarSesionAdmin();
  return NextResponse.redirect(new URL("/", peticion.url), { status: 303 });
}
