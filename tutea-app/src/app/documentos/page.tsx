import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EncabezadoSeccion } from "@/components/seccion";
import { CATEGORIAS, extensionDe, LISTA_CATEGORIAS, tamanoLegible } from "@/lib/documentos";
import { EliminarDocumento, SubirDocumento } from "./controles-admin";

export const metadata = { title: "Documentos" };

export default async function Documentos() {
  const admin = await esAdmin();

  // Sin `contenido`: el archivo en sí solo viaja cuando alguien lo abre o lo
  // descarga (/api/documentos/[id]), nunca con el listado.
  const documentos = await prisma.documento.findMany({
    orderBy: { titulo: "asc" },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      categoria: true,
      nombreArchivo: true,
      tamanoBytes: true,
    },
  });

  return (
    <>
      <EncabezadoSeccion
        titulo="Documentos"
        descripcion="Las políticas de la empresa para consultar y los modelos que necesitas para tus trámites."
      />

      {admin && (
        <div className="mb-8">
          <SubirDocumento />
        </div>
      )}

      <div className="space-y-10">
        {LISTA_CATEGORIAS.map((categoria) => {
          const deEsta = documentos.filter((d) => d.categoria === categoria);
          return (
            <section key={categoria}>
              <h2 className="text-base font-semibold tracking-tight">
                {CATEGORIAS[categoria].titulo}
              </h2>
              <p className="mt-1 text-sm text-texto-suave">{CATEGORIAS[categoria].detalle}</p>

              {deEsta.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-borde bg-superficie/60 px-5 py-6 text-center text-sm text-texto-suave">
                  {admin
                    ? "Todavía no hay documentos aquí. Súbelos con el botón de arriba."
                    : "Todavía no hay documentos publicados en esta sección."}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {deEsta.map((d) => {
                    const extension = extensionDe(d.nombreArchivo);
                    // Una política es solo de lectura: se abre en el visor del
                    // sistema y no tiene botón de descarga. Un modelo solo se
                    // descarga, porque la idea es completarlo.
                    const esPolitica = categoria === "politica";
                    return (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center gap-4 rounded-2xl border border-borde bg-superficie p-4"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-acento-suave text-acento">
                          <FileText aria-hidden size={20} strokeWidth={1.75} />
                        </span>

                        <div className="min-w-0 flex-1 basis-full sm:basis-0">
                          <p className="font-semibold">{d.titulo}</p>
                          {d.descripcion && (
                            <p className="mt-0.5 text-sm text-texto-suave">{d.descripcion}</p>
                          )}
                          <p className="mt-1 text-xs uppercase tracking-wide text-texto-suave">
                            {extension} · {tamanoLegible(d.tamanoBytes)}
                          </p>
                        </div>

                        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                          {esPolitica ? (
                            <Link
                              href={`/documentos/${d.id}`}
                              className="flex items-center gap-1.5 rounded-lg bg-acento px-3 py-1.5 text-sm font-medium text-white hover:bg-acento-fuerte"
                            >
                              <Eye aria-hidden size={15} strokeWidth={1.75} />
                              Ver
                            </Link>
                          ) : (
                            <a
                              href={`/api/documentos/${d.id}`}
                              className="flex items-center gap-1.5 rounded-lg bg-acento px-3 py-1.5 text-sm font-medium text-white hover:bg-acento-fuerte"
                            >
                              <Download aria-hidden size={15} strokeWidth={1.75} />
                              Descargar
                            </a>
                          )}
                          {admin && <EliminarDocumento id={d.id} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
