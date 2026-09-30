"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Muestra una política (RIT, MOF) solo para leer. En vez de dejar que el
 * navegador abra el PDF con su visor propio —que trae botones de descargar
 * e imprimir—, pdf.js dibuja cada página en un lienzo: lo que se ve es una
 * imagen de la página, sin barra de herramientas. Además se bloquea el
 * clic derecho y, al imprimir, sale un aviso en vez del documento.
 *
 * Frena la descarga del uso normal. No es infalible: quien sepa usar las
 * herramientas de desarrollador o saque una captura de pantalla puede
 * quedarse con una copia, porque todo lo que se ve pasa por su navegador.
 */
export function VisorPolitica({ id }: { id: string }) {
  const hojas = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        // pdf.js usa APIs del navegador: se carga recién aquí, nunca en el
        // servidor.
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const respuesta = await fetch(`/api/documentos/${id}`, { cache: "no-store" });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = new Uint8Array(await respuesta.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data: datos }).promise;
        if (cancelado || !hojas.current) return;

        const destino = hojas.current;
        destino.replaceChildren();
        const ancho = destino.clientWidth;
        // Se dibuja a la densidad real de la pantalla para que el texto no
        // se vea borroso; el lienzo se muestra al ancho del contenedor.
        const densidad = window.devicePixelRatio || 1;

        for (let numero = 1; numero <= pdf.numPages; numero++) {
          const pagina = await pdf.getPage(numero);
          const escala = ancho / pagina.getViewport({ scale: 1 }).width;
          const vista = pagina.getViewport({ scale: escala * densidad });

          const lienzo = document.createElement("canvas");
          lienzo.width = Math.floor(vista.width);
          lienzo.height = Math.floor(vista.height);
          lienzo.style.width = "100%";
          lienzo.style.height = "auto";
          lienzo.className = "rounded-lg border border-borde bg-white shadow-sm";
          lienzo.setAttribute("aria-label", `Página ${numero} de ${pdf.numPages}`);
          destino.appendChild(lienzo);

          await pagina.render({ canvas: lienzo, viewport: vista }).promise;
          if (cancelado) return;
        }
        setEstado("listo");
      } catch {
        if (!cancelado) setEstado("error");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <>
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="select-none print:hidden"
      >
        {estado === "cargando" && (
          <p className="rounded-2xl border border-borde bg-superficie px-5 py-10 text-center text-sm text-texto-suave">
            Cargando el documento…
          </p>
        )}
        {estado === "error" && (
          <p role="alert" className="rounded-2xl border border-peligro/25 bg-peligro-suave px-5 py-10 text-center text-sm text-peligro">
            No se pudo mostrar el documento. Vuelve a intentarlo en un momento.
          </p>
        )}
        <div ref={hojas} className="space-y-4" />
      </div>
      <p className="hidden text-sm print:block">
        Este documento es solo de consulta en el Sistema de TH y no se puede imprimir.
      </p>
    </>
  );
}
