import type { CategoriaDocumento } from "@prisma/client";

/**
 * Tope por archivo. Vercel corta cualquier petición en 4,5 MB, así que 4 MB
 * deja margen para el resto del formulario. Un PDF de texto (RIT, MOF) o un
 * Word de modelo entran de sobra; un documento escaneado puede pasarse, y
 * entonces conviene comprimirlo antes de subirlo.
 */
export const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024;

/**
 * Formatos aceptados, por extensión. El tipo MIME se decide aquí y no con lo
 * que manda el navegador: en Windows un .docx a veces llega sin tipo o como
 * "application/octet-stream", y el tipo es lo que después le dice al
 * navegador si puede abrir el archivo o tiene que descargarlo.
 */
export const FORMATOS: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
};

/** Para el atributo `accept` del input de archivo. */
export const ACEPTA = Object.keys(FORMATOS)
  .map((ext) => `.${ext}`)
  .join(",");

export const CATEGORIAS: Record<
  CategoriaDocumento,
  { titulo: string; detalle: string }
> = {
  politica: {
    titulo: "Políticas de la empresa",
    detalle:
      "El Reglamento Interno de Trabajo (RIT), el Manual de Organización y Funciones (MOF) y las demás normas de Tutea. Son solo de consulta: se leen aquí y no se descargan.",
  },
  modelo: {
    titulo: "Modelos para descargar",
    detalle:
      "Formatos listos para completar: solicitud de vacaciones, carta de renuncia y otros trámites.",
  },
};

export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS) as CategoriaDocumento[];

export function extensionDe(nombreArchivo: string): string {
  const punto = nombreArchivo.lastIndexOf(".");
  return punto === -1 ? "" : nombreArchivo.slice(punto + 1).toLowerCase();
}

/** "245 KB", "1,2 MB". */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-PE", { maximumFractionDigits: 1 })} MB`;
}
