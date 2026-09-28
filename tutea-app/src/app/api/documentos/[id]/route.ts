import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Entrega un documento de la empresa. Es público a propósito, igual que el
 * resto del sistema: el equipo entra sin clave y necesita leer el RIT o
 * bajar un modelo.
 *
 * Una política se abre en el navegador (`inline`) para leerla sin guardarla;
 * un modelo se descarga (`attachment`), porque la idea es completarlo. Con
 * `?descargar=1` cualquier documento se descarga igual.
 */
export async function GET(
  peticion: NextRequest,
  ctx: RouteContext<"/api/documentos/[id]">,
) {
  const { id } = await ctx.params;

  const documento = await prisma.documento.findUnique({
    where: { id },
    select: { categoria: true, nombreArchivo: true, tipoMime: true, contenido: true },
  });
  if (!documento) return new NextResponse(null, { status: 404 });

  const forzarDescarga = peticion.nextUrl.searchParams.get("descargar") === "1";
  const modo = documento.categoria === "politica" && !forzarDescarga ? "inline" : "attachment";

  // El nombre puede traer tildes o eñes ("Solicitud de vacaciones.docx"):
  // `filename*` lo lleva codificado para los navegadores actuales, y
  // `filename` una versión sin esos caracteres para los que no lo entienden.
  const nombreAscii = documento.nombreArchivo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/"/g, "");

  return new NextResponse(documento.contenido, {
    headers: {
      "Content-Type": documento.tipoMime,
      "Content-Disposition": `${modo}; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(documento.nombreArchivo)}`,
      // Privado: un documento que se borra no debe quedar servido desde un
      // caché compartido. En el navegador de cada uno sí dura una hora.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
