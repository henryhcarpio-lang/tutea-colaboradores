import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { VisorPolitica } from "./visor-politica";

async function buscarPolitica(id: string) {
  // Solo las políticas tienen visor: un modelo se descarga desde el listado.
  return prisma.documento.findFirst({
    where: { id, categoria: "politica" },
    select: { id: true, titulo: true, descripcion: true },
  });
}

export async function generateMetadata({ params }: PageProps<"/documentos/[id]">) {
  const politica = await buscarPolitica((await params).id);
  return { title: politica?.titulo ?? "Documento" };
}

export default async function VerPolitica({ params }: PageProps<"/documentos/[id]">) {
  const politica = await buscarPolitica((await params).id);
  if (!politica) notFound();

  return (
    <>
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1.5 text-sm text-texto-suave hover:text-texto print:hidden"
      >
        <ArrowLeft aria-hidden size={15} strokeWidth={1.75} />
        Volver a Documentos
      </Link>

      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{politica.titulo}</h1>
        {politica.descripcion && (
          <p className="mt-1 text-sm text-texto-suave">{politica.descripcion}</p>
        )}
        <p className="mt-2 text-xs text-texto-suave print:hidden">
          Documento solo de consulta: se lee aquí y no se puede descargar.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <VisorPolitica id={politica.id} />
      </div>
    </>
  );
}
