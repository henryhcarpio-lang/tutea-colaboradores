"use server";

import { revalidatePath } from "next/cache";
import type { CategoriaDocumento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import {
  extensionDe,
  FORMATOS,
  LISTA_CATEGORIAS,
  TAMANO_MAXIMO_BYTES,
  tamanoLegible,
} from "@/lib/documentos";

export type EstadoDocumento = { error?: string; ok?: boolean };

function refrescar() {
  revalidatePath("/documentos");
}

export async function subirDocumento(
  _previo: EstadoDocumento,
  datos: FormData,
): Promise<EstadoDocumento> {
  await exigirAdmin();

  const titulo = String(datos.get("titulo") ?? "").trim();
  if (titulo.length < 2) return { error: "Ponle un título al documento." };
  if (titulo.length > 120) return { error: "El título es demasiado largo." };

  const descripcion = String(datos.get("descripcion") ?? "").trim();
  if (descripcion.length > 300) return { error: "La descripción es demasiado larga." };

  const categoria = String(datos.get("categoria") ?? "");
  if (!LISTA_CATEGORIAS.includes(categoria as CategoriaDocumento)) {
    return { error: "Elige si es una política o un modelo." };
  }

  const archivo = datos.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elige el archivo que quieres subir." };
  }
  // Se vuelve a validar aquí aunque el navegador ya lo haya hecho: la acción
  // es un punto de entrada público y puede recibir cualquier cosa.
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return {
      error: `El archivo pesa ${tamanoLegible(archivo.size)} y el máximo es ${tamanoLegible(TAMANO_MAXIMO_BYTES)}. Si es un escaneo, comprímelo antes de subirlo.`,
    };
  }
  const tipoMime = FORMATOS[extensionDe(archivo.name)];
  if (!tipoMime) {
    return { error: "Solo se aceptan PDF, Word (.doc, .docx), Excel (.xls, .xlsx) u ODT." };
  }
  // Una política solo se muestra en pantalla, nunca se descarga, y lo único
  // que se puede mostrar sin entregar el archivo es un PDF.
  if (categoria === "politica" && extensionDe(archivo.name) !== "pdf") {
    return { error: "Las políticas se suben en PDF: se muestran en pantalla y no se pueden descargar." };
  }

  await prisma.documento.create({
    data: {
      titulo,
      descripcion: descripcion || null,
      categoria: categoria as CategoriaDocumento,
      nombreArchivo: archivo.name,
      tipoMime,
      tamanoBytes: archivo.size,
      contenido: new Uint8Array(await archivo.arrayBuffer()),
    },
  });

  refrescar();
  return { ok: true };
}

export async function eliminarDocumento(id: string): Promise<void> {
  await exigirAdmin();
  await prisma.documento.delete({ where: { id } });
  refrescar();
}
