const LADO = 400;

/**
 * Recorta la imagen al cuadrado central, la lleva a 400x400 y la devuelve como
 * data URL JPEG (~30-50 KB). Se hace en el navegador para no subir el archivo
 * original ni necesitar una librería de imágenes en el servidor.
 */
export async function redimensionarACuadrado(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  try {
    const lienzo = document.createElement("canvas");
    lienzo.width = LADO;
    lienzo.height = LADO;

    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");

    // Recorte centrado: se toma el cuadrado más grande que entre en la foto.
    const lado = Math.min(bitmap.width, bitmap.height);
    const x = (bitmap.width - lado) / 2;
    const y = (bitmap.height - lado) / 2;

    ctx.fillStyle = "#ffffff"; // fondo para PNG con transparencia
    ctx.fillRect(0, 0, LADO, LADO);
    ctx.drawImage(bitmap, x, y, lado, lado, 0, 0, LADO, LADO);

    return lienzo.toDataURL("image/jpeg", 0.8);
  } finally {
    bitmap.close();
  }
}
