import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Los documentos (RIT, MOF, modelos) se suben con un server action, que
      // por defecto corta en 1 MB. Vercel no acepta más de 4,5 MB por
      // petición, así que ese es el techo real; la acción limita el archivo
      // a 4 MB para dejar margen al encabezado del formulario.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
