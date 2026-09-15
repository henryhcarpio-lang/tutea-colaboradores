/**
 * Estadística rápida del mes: cuánto se asignó contra cuánto se gastó de
 * verdad. "Usadas" cuenta solo los motivos que descuentan cupo —igual
 * criterio que los corazones (`contarQueDescuentan`)—, así que un descanso
 * médico o un desastre natural no inflan este número aunque queden
 * registrados. Aunque es un agregado del equipo entero, no de una persona,
 * queda solo para gerencia: es información de gestión, no algo que el resto
 * del equipo necesite ver en la portada del módulo.
 */
export function ResumenVidas({
  etiquetaMes,
  asignadas,
  usadas,
  sinDescontar,
}: {
  etiquetaMes: string;
  asignadas: number;
  usadas: number;
  sinDescontar: number;
}) {
  const disponibles = Math.max(0, asignadas - usadas);

  const tarjetas = [
    { etiqueta: "Asignadas", valor: asignadas },
    { etiqueta: "Usadas", valor: usadas },
    { etiqueta: "Disponibles", valor: disponibles },
    { etiqueta: "Médico / desastre", valor: sinDescontar },
  ];

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-suave">
        {`Vidas de ${etiquetaMes}`}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tarjetas.map((t) => (
          <div
            key={t.etiqueta}
            className="rounded-2xl border border-borde bg-superficie p-4"
          >
            <p className="text-2xl font-semibold tabular-nums">{t.valor}</p>
            <p className="mt-0.5 text-xs text-texto-suave">{t.etiqueta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
