/**
 * Marcador de carga. La base vive en Oregon y desde Perú cada consulta tarda
 * unas décimas: sin esto la pantalla queda congelada en la sección anterior y
 * parece que el clic no funcionó.
 */
export function Esqueleto({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-borde/70 ${className}`}
    />
  );
}

export function EsqueletoEncabezado() {
  return (
    <div className="mb-8 space-y-3">
      <Esqueleto className="h-8 w-52" />
      <Esqueleto className="h-4 w-full max-w-xl" />
    </div>
  );
}

/** Varias tarjetas con avatar y dos líneas, la forma que tienen casi todas. */
export function EsqueletoFilas({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      {Array.from({ length: cantidad }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-borde bg-superficie p-4"
        >
          <Esqueleto className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-4 w-40" />
            <Esqueleto className="h-3 w-64 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
