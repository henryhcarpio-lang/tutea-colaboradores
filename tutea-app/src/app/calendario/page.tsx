import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hoyEnLima } from "@/lib/fecha";
import { EncabezadoSeccion } from "@/components/seccion";
import {
  claveMes,
  etiquetaMes,
  mesAdyacente,
  parseMes,
  semanasDelMes,
} from "@/lib/calendario";
import { CalendarioMensual, type Evento } from "./calendario-mensual";

export const metadata = { title: "Calendario" };

export default async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const admin = await esAdmin();
  const { mes: mesParam } = await searchParams;
  const { anio, mes } = parseMes(mesParam);
  const semanas = semanasDelMes(anio, mes);

  // El rango de consulta es el de la GRILLA (42 días), no el del mes: así un
  // evento cargado en un día del mes anterior o siguiente que se ve de
  // relleno en esta vista tampoco se pierde.
  const desde = semanas[0][0].fecha;
  const hasta = semanas[semanas.length - 1][6].fecha;

  const eventos = await prisma.calendarEvent.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: "asc" },
  });

  const eventosSerializados: Evento[] = eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    descripcion: e.descripcion,
    fecha: e.fecha.toISOString(),
    estado: e.estado,
  }));

  const anterior = mesAdyacente(anio, mes, -1);
  const siguiente = mesAdyacente(anio, mes, 1);

  return (
    <>
      <EncabezadoSeccion
        titulo="Calendario"
        descripcion="Eventos de la empresa: feriados, campañas e hitos del mes."
      />
      <CalendarioMensual
        etiqueta={etiquetaMes(anio, mes)}
        semanas={semanas.map((fila) =>
          fila.map((c) => ({ ...c, fecha: c.fecha.toISOString() })),
        )}
        eventos={eventosSerializados}
        hrefAnterior={`/calendario?mes=${claveMes(anterior.anio, anterior.mes)}`}
        hrefSiguiente={`/calendario?mes=${claveMes(siguiente.anio, siguiente.mes)}`}
        hrefHoy="/calendario"
        hoy={hoyEnLima().toISOString().slice(0, 10)}
        admin={admin}
      />
    </>
  );
}
