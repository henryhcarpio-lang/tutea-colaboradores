"use client";

const TRAZO =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

type Estado = "disponible" | "usada" | "excedida";

function Corazon({
  estado,
  animar,
  titulo,
}: {
  estado: Estado;
  animar: boolean;
  titulo: string;
}) {
  const disponible = estado === "disponible";
  const excedida = estado === "excedida";

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={titulo}
      className={`h-6 w-6 shrink-0 ${animar ? "romperse" : ""}`}
    >
      <title>{titulo}</title>
      <path
        d={TRAZO}
        className={
          disponible
            ? "fill-[#e11d48]"
            : excedida
              ? "fill-[#7f1d1d]"
              : "fill-[#d4d8e0]"
        }
      />
      {/* La grieta: una línea en zigzag del color del fondo parte el corazón
          al medio. Solo aparece en los ya gastados. */}
      {!disponible && (
        <polyline
          points="12,4 9.6,10 13.4,13 10.6,21"
          fill="none"
          stroke="var(--superficie)"
          strokeWidth="1.9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * Fila de corazones al estilo de un videojuego: llenos los disponibles, rotos
 * los gastados. Si se usaron más vidas que el cupo, los excedentes se agregan
 * al final en rojo oscuro, en vez de bloquear el registro.
 */
export function Corazones({
  asignadas,
  usadas,
  indiceAnimado,
}: {
  asignadas: number;
  usadas: number;
  /** Índice del corazón que se acaba de gastar; se anima solo ese. */
  indiceAnimado: number | null;
}) {
  const gastadas = Math.min(usadas, asignadas);
  const excedidas = Math.max(0, usadas - asignadas);
  const disponibles = Math.max(0, asignadas - usadas);

  if (asignadas === 0 && excedidas === 0) {
    return <span className="text-sm text-texto-suave">Sin cupo este mes</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: gastadas }, (_, i) => (
        <Corazon
          key={`u${i}`}
          estado="usada"
          animar={indiceAnimado === i}
          titulo="Vida usada"
        />
      ))}
      {Array.from({ length: disponibles }, (_, i) => (
        <Corazon
          key={`d${i}`}
          estado="disponible"
          animar={false}
          titulo="Vida disponible"
        />
      ))}
      {excedidas > 0 && (
        <span className="ml-1 flex items-center gap-1">
          {Array.from({ length: excedidas }, (_, i) => (
            <Corazon
              key={`e${i}`}
              estado="excedida"
              animar={indiceAnimado === asignadas + i}
              titulo="Vida excedida"
            />
          ))}
          <span className="text-xs font-semibold text-peligro">
            {excedidas} de más
          </span>
        </span>
      )}
    </div>
  );
}
