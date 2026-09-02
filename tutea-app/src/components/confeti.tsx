"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

// Los colores de la marca, para que la celebración se sienta parte del sistema.
const COLORES = ["#154DB2", "#22D166", "#029336", "#002A66"];

/**
 * Celebración al entrar a la plataforma el día del cumpleaños (Entregable 6).
 *
 * El saludo se muestra apenas carga la página; el confeti se dispara una sola
 * vez por día y por navegador, porque volver a lanzarlo en cada navegación
 * entre secciones pasaría de fiesta a molestia.
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

    // Quien pidió menos movimiento en su sistema recibe el saludo sin confeti.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animando = true;
    const fin = Date.now() + 2200;
    const disparar = () => {
      if (!animando) return;
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors: COLORES,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors: COLORES,
      });
      if (Date.now() < fin) requestAnimationFrame(disparar);
    };
    disparar();

    return () => {
      animando = false;
    };
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
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-borde bg-superficie px-5 py-3 shadow-lg">
        <span aria-hidden className="text-2xl">
          🎉
        </span>
        <p className="text-sm font-semibold">{saludo}</p>
        <button
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Cerrar el saludo"
          className="ml-2 text-texto-suave hover:text-texto"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
