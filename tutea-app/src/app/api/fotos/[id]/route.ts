import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Sirve la foto de un colaborador como imagen real, no como el data URL
 * base64 guardado en la base. Ver `src/lib/foto.ts` para el porqué.
 *
 * `max-age=31536000, immutable` es seguro porque la URL lleva `?v=` con la
 * fecha de actualización del colaborador (`urlFoto()`): cuando alguien
 * cambia su foto, `actualizadoEn` cambia, la URL cambia, y el navegador pide
 * una copia nueva en vez de servir la vieja desde el caché.
 */
export async function GET(
  _peticion: NextRequest,
  ctx: RouteContext<"/api/fotos/[id]">,
) {
  const { id } = await ctx.params;

  const colaborador = await prisma.collaborator.findUnique({
    where: { id },
    select: { foto: true },
  });

  const encabezado = colaborador?.foto
    ? /^data:([\w/+.-]+);base64,(.+)$/.exec(colaborador.foto)
    : null;
  if (!encabezado) {
    return new NextResponse(null, { status: 404 });
  }

  const [, mime, base64] = encabezado;
  return new NextResponse(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
