import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth";
import { FormularioIngreso } from "./formulario";

export const metadata = { title: "Ingresar" };

export default async function Ingresar() {
  if (await esAdmin()) redirect("/");

  return (
    <div className="aparecer mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Acceso de gerencia
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-texto-suave">
        Consultar horarios, vidas y cumpleaños no requiere clave. Esto es solo
        para crear y editar.
      </p>
      <FormularioIngreso />
    </div>
  );
}
