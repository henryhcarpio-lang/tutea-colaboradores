"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MODULOS = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/horarios", etiqueta: "Horarios" },
  { href: "/vidas", etiqueta: "Vidas" },
  { href: "/cumpleanos", etiqueta: "Cumpleaños" },
] as const;

function claseEnlace(activo: boolean) {
  return `shrink-0 rounded-lg px-3 py-1.5 text-sm ${
    activo
      ? "bg-acento-suave font-medium text-acento"
      : "text-texto-suave hover:bg-fondo hover:text-texto"
  }`;
}

export function Navegacion({ admin }: { admin: boolean }) {
  const ruta = usePathname();
  const esActivo = (href: string) =>
    href === "/" ? ruta === "/" : ruta.startsWith(href);

  return (
    <header className="border-b border-borde/70 bg-superficie/80 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-6 py-3">
        {/* Fila 1: identidad y sesión. En móvil el menú baja a su propia fila
            para que nada se corte ni empuje la página a lo ancho. */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image
              src="/tutea-logo.png"
              alt="Tutea"
              width={1597}
              height={1451}
              priority
              className="h-7 w-auto"
            />
            <span className="text-[15px] font-semibold tracking-tight">
              Tutea
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {MODULOS.map((modulo) => (
              <Link
                key={modulo.href}
                href={modulo.href}
                aria-current={esActivo(modulo.href) ? "page" : undefined}
                className={claseEnlace(esActivo(modulo.href))}
              >
                {modulo.etiqueta}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {admin ? (
              <>
                <Link
                  href="/colaboradores"
                  className={`hidden lg:block ${claseEnlace(esActivo("/colaboradores"))}`}
                >
                  Colaboradores
                </Link>
                <span className="rounded-full bg-acento-suave px-2.5 py-1 text-xs font-medium text-acento">
                  Admin
                </span>
                <form action="/api/sesion/salir" method="post">
                  <button
                    type="submit"
                    className="text-sm text-texto-suave hover:text-texto"
                  >
                    Salir
                  </button>
                </form>
              </>
            ) : (
              // Discreto a propósito: la puerta de entrada del sistema es la
              // vista pública, no el login (§2 del spec).
              <Link
                href="/ingresar"
                className="text-sm text-texto-suave hover:text-texto"
              >
                Ingresar
              </Link>
            )}
          </div>
        </div>

        {/* Fila 2, solo en móvil. Scroll horizontal propio si no entra. */}
        <nav className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto pb-0.5 lg:hidden">
          {MODULOS.map((modulo) => (
            <Link
              key={modulo.href}
              href={modulo.href}
              aria-current={esActivo(modulo.href) ? "page" : undefined}
              className={claseEnlace(esActivo(modulo.href))}
            >
              {modulo.etiqueta}
            </Link>
          ))}
          {admin && (
            <Link
              href="/colaboradores"
              className={claseEnlace(esActivo("/colaboradores"))}
            >
              Colaboradores
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
