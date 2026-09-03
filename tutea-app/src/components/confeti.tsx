"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { esperaRestanteMs, lanzarConfeti } from "@/lib/celebracion";

/**
 * Celebración al entrar a la plataforma el día del cumpleaños (Entregable 6).
 *
 * El saludo se muestra apenas carga la página y el confeti se dispara solo una
 * vez por día y por navegador: repetirlo en cada navegación entre secciones
 * pasaría de fiesta a molestia. Pero el saludo es un botón, así que quien
 * quiera volver a verlo solo tiene que tocarlo.
 */
export function Confeti({
  nombres,
  clave,
}: {
  nombres: string[];
  /** Fecha de hoy en Lima; cambia al día siguiente y rehabilita el saludo. */
  clave: string;
}) {
  const [cerrado, setCerrado] = useState(false);
  const [enEspera, setEnEspera] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function celebrar() {
    lanzarConfeti(1800);
    const espera = esperaRestanteMs();
    if (espera === 0) return;
    setEnEspera(true);
    temporizador.current = setTimeout(() => setEnEspera(false), espera);
  }

  useEffect(() => {
    if (nombres.length === 0) return;

    const marca = `tutea_cumple_${clave}`;
    try {
      if (sessionStorage.getItem(marca)) return;
      sessionStorage.setItem(marca, "1");
    } catch {
      // Navegador con el almacenamiento bloqueado: el confeti se repetirá al
      // navegar. Preferible a no celebrar.
    }

    return lanzarConfeti();
  }, [nombres, clave]);

  if (cerrado || nombres.length === 0) return null;

  const saludo =
    nombres.length === 1
      ? `¡Feliz cumpleaños, ${nombres[0]}!`
      : `¡Feliz cumpleaños, ${nombres.slice(0, -1).join(", ")} y ${
          nombres[nombres.length - 1]
        }!`;

  return (
    <div
      role="status"
      className="aparecer pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-4 lg:top-20"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-borde bg-superficie py-1 pl-1 pr-2 shadow-lg">
        <button
          type="button"
          onClick={celebrar}
          disabled={enEspera}
          title={enEspera ? "Esperá un momento" : "Tocá para más confeti"}
          className="flex items-center gap-3 rounded-xl px-4 py-2 hover:bg-acento-suave disabled:cursor-default disabled:hover:bg-transparent"
        >
          <PartyPopper
            aria-hidden
            size={22}
            strokeWidth={1.75}
            className="text-acento"
          />
          <span className="text-sm font-semibold">{saludo}</span>
        </button>
        <button
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Cerrar el saludo"
          className="grid h-8 w-8 place-items-center rounded-lg text-texto-suave hover:bg-fondo hover:text-texto"
        >
          <X aria-hidden size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
