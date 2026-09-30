import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Entrega un documento de la empresa. Es público a propósito, igual que el
 * resto del sistema: el equipo entra sin clave.
 *
 * - Un **modelo** se descarga (`attachment`): la idea es completarlo.
 * - Una **política** (RIT, MOF) es solo de lectura: la pide el visor de
 *   /documentos/[id] con `fetch` y la dibuja página por página, sin el visor
 *   propio del navegador, que trae botón de descargar. Si alguien abre esta
 *   URL directo en una pestaña (`Sec-Fetch-Dest: document`), se lo manda al
 *   visor en vez de entregarle el PDF, y nunca sale como `attachment`.
 *
 * Esto evita la descarga para el uso normal, no para quien se lo proponga:
 * lo que se muestra en pantalla viaja al navegador de alguna forma.
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

  if (documento.categoria === "politica") {
    if (peticion.headers.get("sec-fetch-dest") === "document") {
      return NextResponse.redirect(new URL(`/documentos/${id}`, peticion.url));
    }
    return new NextResponse(documento.contenido, {
      headers: {
        "Content-Type": documento.tipoMime,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        // Sin caché: no dejar una copia del archivo guardada en el equipo.
        "Cache-Control": "no-store",
      },
    });
  }

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
      "Content-Disposition": `attachment; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(documento.nombreArchivo)}`,
      // Privado: un documento que se borra no debe quedar servido desde un
      // caché compartido. En el navegador de cada uno sí dura una hora.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
