import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/avatar";
import { InsigniaArea } from "@/components/insignia-area";
import { EncabezadoSeccion, EstadoVacio } from "@/components/seccion";
import { etiquetaMesPeriodo, hoyEnLima, mesPeriodoActual, partesEnLima } from "@/lib/fecha";
import { calcularCumple, cuentaRegresiva, DIAS_DE_AVISO } from "@/lib/cumpleanos";
import { urlFoto } from "@/lib/foto";
import { TarjetaCumple } from "./tarjeta-cumple";

export const metadata = { title: "Cumpleaños" };

export default async function Cumpleanos() {
  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      actualizadoEn: true,
      fechaNacimiento: true,
    },
  });

  const mesActual = partesEnLima().mes;

  // Sin fecha cargada no hay cumpleaños que anunciar: esa persona no aparece
  // en el módulo hasta que gerencia complete el dato.
  const conCumple = colaboradores
    .filter((c) => c.fechaNacimiento !== null)
    .map(({ actualizadoEn, foto, id, ...resto }) => ({
      ...resto,
      id,
      foto: urlFoto(id, foto, actualizadoEn),
      cumple: calcularCumple(resto.fechaNacimiento!),
    }));

  const sinFecha = colaboradores.filter((c) => c.fechaNacimiento === null);

  // La lista es la del mes corriente, ordenada por día.
  const delMes = conCumple
    .filter((c) => c.cumple.mes === mesActual)
    .sort((a, b) => a.cumple.dia - b.cumple.dia);

  const deHoy = conCumple.filter((c) => c.cumple.esHoy);

  // El aviso mira los próximos 7 días aunque caigan en el mes que viene: un
  // cumpleaños del 2 de octubre importa el 28 de septiembre.
  const seVienen = conCumple
    .filter((c) => c.cumple.seViene)
    .sort((a, b) => a.cumple.faltan - b.cumple.faltan);

  // Estabiliza el saludo durante todo el día, y evita que difieran servidor y
  // navegador.
  const semilla = hoyEnLima().toISOString().slice(0, 10);

  const mes = etiquetaMesPeriodo(mesPeriodoActual());

  return (
    <>
      <EncabezadoSeccion
        titulo="Cumpleaños"
        descripcion={`Quién cumple años en ${mes}.`}
      />

      {/* Quien cumple hoy se lleva la tarjeta grande, con su foto al centro.
          El resto de los avisos van en la lista compacta de abajo. */}
      {deHoy.map((c) => (
        <TarjetaCumple
          key={c.id}
          nombre={c.nombre}
          foto={c.foto}
          area={c.area}
          edad={c.cumple.edad}
          fecha={c.cumple.etiqueta}
          semilla={semilla}
        />
      ))}

      {seVienen.length > 0 && (
        <section className="aparecer mb-8 rounded-2xl border border-acento/25 bg-acento-suave p-5">
          <h2 className="text-sm font-semibold text-acento">
            {`En los próximos ${DIAS_DE_AVISO} días`}
          </h2>
          <ul className="mt-4 space-y-3">
            {seVienen.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3">
                <Avatar
                  nombre={c.nombre}
                  foto={c.foto}
                  area={c.area}
                  tamano="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-texto-suave">
                    Cumple {c.cumple.edad}{" "}
                    {c.cumple.edad === 1 ? "año" : "años"} el{" "}
                    {c.cumple.etiqueta}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    c.cumple.esHoy
                      ? "bg-acento text-white"
                      : "bg-superficie text-acento"
                  }`}
                >
                  {cuentaRegresiva(c.cumple.faltan)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {delMes.length === 0 ? (
        <EstadoVacio
          titulo={`Nadie cumple años en ${mes}`}
          detalle="Los cumpleaños salen de la fecha de nacimiento cargada en cada colaborador."
        />
      ) : (
        <ul className="space-y-3">
          {delMes.map((c) => (
            <li
              key={c.id}
              className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-superficie p-4 ${
                c.cumple.esHoy ? "border-acento/40" : "border-borde"
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fondo text-center leading-none">
                <span className="text-[10px] font-semibold uppercase text-texto-suave">
                  {mes.slice(0, 3)}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {c.cumple.dia}
                </span>
              </span>

              <Avatar
                nombre={c.nombre}
                foto={c.foto}
                area={c.area}
                tamano="md"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{c.nombre}</p>
                  <InsigniaArea area={c.area} />
                </div>
                <p className="mt-0.5 text-sm text-texto-suave">
                  Cumple {c.cumple.edad}{" "}
                  {c.cumple.edad === 1 ? "año" : "años"}
                </p>
              </div>

              {(c.cumple.esHoy || c.cumple.seViene) && (
                <span className="text-xs font-semibold text-acento">
                  {cuentaRegresiva(c.cumple.faltan)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {sinFecha.length > 0 && (
        <p className="mt-6 text-sm text-texto-suave">
          {sinFecha.length === 1
            ? "1 persona no tiene cargada su fecha de nacimiento"
            : `${sinFecha.length} personas no tienen cargada su fecha de nacimiento`}
          : {sinFecha.map((c) => c.nombre).join(", ")}.
        </p>
      )}
    </>
  );
}
