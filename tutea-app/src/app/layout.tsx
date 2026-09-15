import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { esAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hoyEnLima } from "@/lib/fecha";
import { calcularCumple } from "@/lib/cumpleanos";
import { colaboradoresConContratoPorVencer } from "@/lib/vacaciones-servidor";
import { Navegacion } from "@/components/navegacion";
import { Confeti } from "@/components/confeti";

// Montserrat es una de las dos tipografías del brandbook y está en Google
// Fonts. La otra, Averta, es comercial: si Tutea tiene la licencia se suma
// después como fuente local sin tocar nada más.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  // Cada sección aporta su nombre; sin esto todas las pestañas se llamaban
  // igual y era imposible distinguirlas con varias abiertas.
  title: {
    default: "Colaboradores — Tutea",
    template: "%s — Tutea",
  },
  description: "Horarios, vidas y cumpleaños del equipo de Tutea.",
  icons: { icon: "/tutea-logo.png" },
};

/** Quiénes cumplen años hoy, en hora de Lima. */
async function cumpleanerosDeHoy(): Promise<string[]> {
  const colaboradores = await prisma.collaborator.findMany({
    where: { activo: true },
    select: { nombre: true, fechaNacimiento: true },
  });
  return colaboradores
    .filter((c) => c.fechaNacimiento !== null)
    .filter((c) => calcularCumple(c.fechaNacimiento!).esHoy)
    .map((c) => c.nombre.split(/\s+/)[0]);
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await esAdmin();
  // El aviso de contratos por vencer solo importa —y solo se consulta— para
  // quien puede hacer algo al respecto. Se calcula acá, no solo en
  // /vacaciones, para que la alerta llegue a gerencia entre en la página que
  // entre, como el saludo de cumpleaños.
  const [cumpleaneros, contratosPorVencer] = await Promise.all([
    cumpleanerosDeHoy(),
    admin ? colaboradoresConContratoPorVencer() : Promise.resolve([]),
  ]);

  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* El saludo vive en el layout, no en la sección de Cumpleaños: el spec
            pide que aparezca "al entrar a la plataforma", sea cual sea la
            página por la que se entra. */}
        <Confeti
          nombres={cumpleaneros}
          clave={hoyEnLima().toISOString().slice(0, 10)}
        />
        <Navegacion admin={admin} avisosVacaciones={contratosPorVencer.length} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-borde/70 py-6 text-center text-xs text-texto-suave">
          Tutea · Asesoría e investigación científica
        </footer>
      </body>
    </html>
  );
}
