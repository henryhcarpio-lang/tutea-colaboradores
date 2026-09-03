import confetti from "canvas-confetti";

// Los colores de la marca, para que la celebración se sienta parte del sistema.
export const COLORES_CONFETI = ["#154DB2", "#22D166", "#029336", "#6D28D9"];

export function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Lluvia de confeti desde los dos costados. Se usa al entrar el día del
 * cumpleaños y cada vez que alguien toca el saludo.
 *
 * Devuelve una función para cortarla antes de tiempo (al desmontar).
 */
export function lanzarConfeti(duracionMs = 2600): () => void {
  if (prefiereMenosMovimiento()) return () => {};

  // Golpe inicial, para que la celebración arranque llena y no de a goteo.
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: COLORES_CONFETI,
  });

  let vivo = true;
  const fin = Date.now() + duracionMs;

  const disparar = () => {
    if (!vivo) return;
    confetti({
      particleCount: 9,
      angle: 60,
      spread: 80,
      startVelocity: 42,
      origin: { x: 0, y: 0.75 },
      colors: COLORES_CONFETI,
    });
    confetti({
      particleCount: 9,
      angle: 120,
      spread: 80,
      startVelocity: 42,
      origin: { x: 1, y: 0.75 },
      colors: COLORES_CONFETI,
    });
    if (Date.now() < fin) requestAnimationFrame(disparar);
  };
  disparar();

  return () => {
    vivo = false;
  };
}
