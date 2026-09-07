/**
 * Convierte la foto guardada (un data URL base64 en la base) en la URL corta
 * que sirve `/api/fotos/[id]`, en vez de mandar los ~25KB de la imagen cada
 * vez que aparece un `<Avatar>` en la página.
 *
 * Importa sobre todo en la cuadrícula de Horarios: ahí la misma persona
 * aparece una vez por cada bloque de su semana, así que su foto se repetía
 * tantas veces como bloques tuviera. Con una URL en vez del data URL inline,
 * el navegador la pide una sola vez y la reutiliza en cada aparición gracias
 * al caché HTTP normal, en lugar de recibir el mismo texto base64 de nuevo
 * por cada bloque.
 *
 * El parámetro `v` (la fecha de actualización del colaborador) invalida el
 * caché del navegador cuando alguien cambia su foto, sin tener que pensar en
 * una expiración corta.
 */
export function urlFoto(
  id: string,
  foto: string | null,
  actualizadoEn: Date,
): string | null {
  if (!foto) return null;
  return `/api/fotos/${id}?v=${actualizadoEn.getTime()}`;
}
