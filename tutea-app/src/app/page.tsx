import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { esAdmin } from "@/lib/auth";
import { mesPeriodoActual, etiquetaMesPeriodo } from "@/lib/fecha";
import { MODULOS_PORTADA } from "@/lib/modulos";

export default async function Inicio() {
  const admin = await esAdmin();

  return (
    <div className="aparecer">
      <p className="text-sm text-texto-suave">
        {etiquetaMesPeriodo(mesPeriodoActual())}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Bienvenido, colaborador
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-texto-suave">
        {admin
          ? "Estás con la sesión de administrador: puedes crear, editar y eliminar."
          : "Aquí tienes a mano tu horario, tus vidas del mes y los cumpleaños que se vienen. Entras y consultas: no hace falta clave ni crear una cuenta."}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS_PORTADA.filter((m) => !m.soloAdmin || admin).map(
          ({ href, etiqueta, detalle, Icono }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-borde bg-superficie p-6 hover:border-acento/40 hover:shadow-sm"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-acento-suave text-acento">
                <Icono aria-hidden size={20} strokeWidth={1.75} />
              </span>
              <h2 className="mt-4 flex items-center gap-1.5 text-[15px] font-semibold group-hover:text-acento">
                {etiqueta}
                <ArrowRight
                  aria-hidden
                  size={15}
                  strokeWidth={1.75}
                  className="opacity-0 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-texto-suave">
                {detalle}
              </p>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
