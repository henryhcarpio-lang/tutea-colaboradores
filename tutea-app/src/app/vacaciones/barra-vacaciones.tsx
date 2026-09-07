"use client";

/**
 * Barra de saldo, el equivalente de los corazones de Vidas pero para una
 * cantidad más grande: cada goce ya tomado es su propio segmento, separado
 * por un hueco fino, así se lee de un vistazo "tomó 15, después 5, le
 * quedan 10" en vez de un bloque azul anónimo. El excedente (adelanto) se
 * pinta aparte, nunca se esconde.
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

  return (
    <div className="flex h-3 w-full max-w-md overflow-hidden rounded-full bg-fondo">
      {usos.map((u, i) => {
        // Si este goce cruza la frontera del cupo, se parte visualmente en
        // "dentro del cupo" (azul) y "excedente" (rojo) sin que el usuario
        // tenga que hacer la cuenta.
        const usadosHastaAca = usos.slice(0, i).reduce((t, x) => t + x.dias, 0);
        const dentroDelCupo = Math.max(
          0,
          Math.min(u.dias, asignados - usadosHastaAca),
        );
        const excedenteDeEste = u.dias - dentroDelCupo;
        return (
          <span key={u.id} title={u.etiqueta} className="flex h-full">
            {dentroDelCupo > 0 && (
              <span
                className="h-full bg-acento"
                style={{
                  width: `${(dentroDelCupo / escala) * 100}%`,
                  boxShadow: "0 0 0 1.5px var(--superficie)",
                }}
              />
            )}
            {excedenteDeEste > 0 && (
              <span
                className="h-full bg-peligro"
                style={{
                  width: `${(excedenteDeEste / escala) * 100}%`,
                  boxShadow: "0 0 0 1.5px var(--superficie)",
                }}
              />
            )}
          </span>
        );
      })}
      {disponibles > 0 && (
        <span
          title={`${disponibles} disponibles`}
          className="h-full bg-verde"
          style={{ width: `${(disponibles / escala) * 100}%` }}
        />
      )}
    </div>
  );
}
