import { EsqueletoEncabezado, EsqueletoFilas } from "@/components/esqueleto";

export default function Cargando() {
  return (
    <>
      <EsqueletoEncabezado />
      <EsqueletoFilas cantidad={2} />
    </>
  );
}
