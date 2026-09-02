import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { mesPeriodoActual, etiquetaMesPeriodo } from "@/lib/fecha";

const MODULOS = [
  {
    soloAdmin: false,
    href: "/horarios",
    titulo: "Horarios",
    detalle:
      "El horario semanal de cada colaborador, de lunes a sábado, con sus bloques y cortes de almuerzo.",
  },
  {
    soloAdmin: false,
    href: "/vidas",
    titulo: "Vidas",
    detalle:
      "Los permisos disponibles del mes, en corazones. Se reinician solos al empezar cada mes.",
  },
  {
    soloAdmin: false,
    href: "/cumpleanos",
    titulo: "Cumpleaños",
    detalle:
      "Quién cumple años este mes, y un aviso destacado cuando el día se acerca.",
  },
  {
    href: "/colaboradores",
    titulo: "Colaboradores",
    detalle:
      "Alta, edición y baja del equipo. Todo lo demás depende de esta sección.",
    soloAdmin: true,
  },
] as const;

export default async function Inicio() {
  const admin = await esAdmin();

  return (
    <div className="aparecer">
      <p className="text-sm text-texto-suave">
        {etiquetaMesPeriodo(mesPeriodoActual())}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Colaboradores de Tutea
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-texto-suave">
        Todo el equipo puede consultar esta página sin necesidad de clave ni de
        crear una cuenta.{" "}
        {admin
          ? "Estás con la sesión de administrador: podés crear, editar y eliminar."
          : "Es de solo lectura: para editar hace falta la clave de gerencia."}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.filter((m) => !m.soloAdmin || admin).map((modulo) => (
          <Link
            key={modulo.href}
            href={modulo.href}
            className="group rounded-2xl border border-borde bg-superficie p-6 hover:border-acento/40 hover:shadow-sm"
          >
            <h2 className="text-[15px] font-semibold group-hover:text-acento">
              {modulo.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-texto-suave">
              {modulo.detalle}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
