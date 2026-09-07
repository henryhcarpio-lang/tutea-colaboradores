import Link from "next/link";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asegurarPeriodos } from "@/lib/vidas";
import { EncabezadoSeccion } from "@/components/seccion";
import { etiquetaMesPeriodo, hoyEnLima, mesPeriodoActual } from "@/lib/fecha";
import { urlFoto } from "@/lib/foto";
import { PanelVidas, type FilaVidas } from "./panel-vidas";

export const metadata = { title: "Vidas" };

export default async function Vidas() {
  const admin = await esAdmin();

  // Cierre y apertura de mes perezosos: sin cron ni proceso en segundo plano
  // (§3.6). Es idempotente, así que correrlo en cada carga no molesta.
  await asegurarPeriodos();

  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      foto: true,
      area: true,
      actualizadoEn: true,
      periodos: {
        where: { cerradoEn: null },
        take: 1,
        select: {
          id: true,
          vidasAsignadas: true,
          usos: {
            orderBy: { fecha: "asc" },
            select: { id: true, fecha: true, motivo: true, tipo: true },
          },
        },
      },
    },
  });

  const filas: FilaVidas[] = colaboradores
    .filter((c) => c.periodos.length > 0)
    .map(({ periodos, actualizadoEn, foto, id, ...resto }) => {
      const periodo = periodos[0];
      return {
        colaborador: { id, foto: urlFoto(id, foto, actualizadoEn), ...resto },
        periodoId: periodo.id,
        vidasAsignadas: periodo.vidasAsignadas,
        usos: periodo.usos.map((u) => ({
          id: u.id,
          fecha: u.fecha.toISOString(),
          tipo: u.tipo,
          // El motivo ni siquiera se manda al navegador si no hay sesión de
          // admin: ocultarlo con CSS dejaría el dato al alcance de cualquiera.
          motivo: admin ? u.motivo : null,
        })),
      };
    });

  const mes = etiquetaMesPeriodo(mesPeriodoActual());

  return (
    <>
      <EncabezadoSeccion
        titulo="Vidas"
        descripcion={`Permisos disponibles de ${mes}. El cupo se reinicia solo al empezar cada mes.`}
        acciones={
          <Link
            href="/vidas/historial"
            className="rounded-xl border border-borde px-3 py-2 text-sm hover:bg-superficie"
          >
            Ver meses anteriores
          </Link>
        }
      />
      <PanelVidas
        filas={filas}
        admin={admin}
        hoy={hoyEnLima().toISOString().slice(0, 10)}
        etiquetaMes={mes}
      />
    </>
  );
}
