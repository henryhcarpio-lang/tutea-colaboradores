"use client";

/** Gris apagado: lo consumido se lee como gastado, no como un dato activo. */
const CONSUMIDO = "#aab3c4";

/**
 * Barra de saldo, el equivalente de los corazones de Vidas pero para una
 * cantidad más grande: cada goce ya tomado es su propio segmento, separado
 * por un hueco fino, así se lee de un vistazo "tomó 15, después 5, le
 * quedan 10" en vez de un bloque anónimo. El excedente (adelanto) se pinta
 * aparte, nunca se esconde.
 *
 * Lo disponible va primero, en verde, y lo gastado después en gris: la barra
 * se lee como lo que le queda a la persona —que es el dato que importa— y no
 * como cuánto lleva consumido.
 *
 * Todos los segmentos son hijos DIRECTOS del contenedor flex, sin un `span`
 * que agrupe los dos pedazos de un mismo goce: un envoltorio sin ancho
 * propio deja los `width` en porcentaje resolviéndose contra cero, y la
 * barra se dibuja vacía.
 */
export function BarraVacaciones({
  asignados,
  usos,
}: {
  asignados: number;
  usos: { id: string; dias: number; etiqueta: string }[];
}) {
  const usados = usos.reduce((t, u) => t + u.dias, 0);
  const disponibles = Math.max(0, asignados - usados);
  const escala = Math.max(asignados, usados, 1);

  const segmentos: { clave: string; ancho: number; color: string; titulo: string }[] = [];

  if (disponibles > 0) {
    segmentos.push({
      clave: "disponibles",
      ancho: disponibles,
      color: "var(--verde)",
      titulo: `${disponibles} disponibles`,
    });
  }

  let acumulado = 0;
  for (const u of usos) {
    // Si este goce cruza la frontera del cupo, se parte visualmente en
    // "dentro del cupo" (gris) y "excedente" (rojo) sin que el usuario tenga
    // que hacer la cuenta.
    const dentroDelCupo = Math.max(0, Math.min(u.dias, asignados - acumulado));
    const excedente = u.dias - dentroDelCupo;
    if (dentroDelCupo > 0) {
      segmentos.push({
        clave: `${u.id}-cupo`,
        ancho: dentroDelCupo,
        color: CONSUMIDO,
        titulo: u.etiqueta,
      });
    }
    if (excedente > 0) {
      segmentos.push({
        clave: `${u.id}-extra`,
        ancho: excedente,
        color: "var(--peligro)",
        titulo: `${u.etiqueta} (de adelanto)`,
      });
    }
    acumulado += u.dias;
  }

  return (
    <div className="flex h-3 w-full max-w-md overflow-hidden rounded-full bg-fondo">
      {segmentos.map((s) => (
        <span
          key={s.clave}
          title={s.titulo}
          className="h-full"
          style={{
            width: `${(s.ancho / escala) * 100}%`,
            backgroundColor: s.color,
            boxShadow: "0 0 0 1.5px var(--superficie)",
          }}
        />
      ))}
    </div>
  );
}
