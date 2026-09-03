"use client";

import { useEffect } from "react";
import type { Area } from "@prisma/client";
import { Avatar } from "@/components/avatar";
import { lanzarConfeti, prefiereMenosMovimiento } from "@/lib/celebracion";

/**
 * Los saludos varían para que el mensaje no se vuelva un cartel fijo que nadie
 * lee. La elección es determinista —depende del nombre y la fecha—, no al azar:
 * el servidor y el navegador tienen que llegar al mismo texto, y además el
 * saludo no debe cambiar si la persona recarga la página en el día.
 */
const SALUDOS = [
  (n: string) => `¡Feliz cumpleaños, ${n}! Gracias por formar parte de Tutea.`,
  (n: string) => `¡${n}, feliz cumpleaños! Gracias por ser parte de Tutea.`,
  (n: string) => `¡Hoy es tu día, ${n}! Feliz cumpleaños de parte de todo Tutea.`,
  (n: string) => `¡Feliz vuelta al sol, ${n}! Tutea no sería lo mismo sin vos.`,
  (n: string) => `¡Feliz cumpleaños, ${n}! Que este año te traiga cosas lindas.`,
];

function elegirSaludo(nombre: string, semilla: string): string {
  const texto = nombre + semilla;
  let suma = 0;
  for (let i = 0; i < texto.length; i++) suma = (suma + texto.charCodeAt(i)) % 9973;
  return SALUDOS[suma % SALUDOS.length](nombre.split(/\s+/)[0]);
}

/** Cintas de papel picado a los costados, en CSS. */
function Adorno({ lado }: { lado: "izquierda" | "derecha" }) {
  const piezas = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 w-16 overflow-hidden ${
        lado === "izquierda" ? "left-0" : "right-0"
      }`}
    >
      {piezas.map((i) => (
        <span
          key={i}
          className="papelito absolute block rounded-[2px]"
          style={{
            left: `${(i * 37) % 80}%`,
            top: `${(i * 23) % 90}%`,
            width: i % 3 === 0 ? 7 : 5,
            height: i % 2 === 0 ? 12 : 8,
            background: ["#154DB2", "#22D166", "#029336", "#6D28D9"][i % 4],
            animationDelay: `${(i % 5) * 0.4}s`,
            transform: `rotate(${(i * 47) % 180}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function TarjetaCumple({
  nombre,
  foto,
  area,
  edad,
  fecha,
  semilla,
}: {
  nombre: string;
  foto: string | null;
  area: Area;
  edad: number;
  fecha: string;
  /** Fecha de hoy: mantiene estable el saludo durante todo el día. */
  semilla: string;
}) {
  useEffect(() => {
    // La sección de Cumpleaños celebra al entrar, aunque el saludo de la barra
    // ya se haya mostrado en otra página.
    if (prefiereMenosMovimiento()) return;
    return lanzarConfeti(2000);
  }, [semilla, nombre]);

  return (
    <section className="aparecer relative mb-8 overflow-hidden rounded-3xl border border-acento/25 bg-gradient-to-b from-acento-suave to-superficie px-6 py-10 text-center sm:px-20">
      <Adorno lado="izquierda" />
      <Adorno lado="derecha" />

      <button
        type="button"
        onClick={() => lanzarConfeti(1800)}
        title="Tocá para más confeti"
        className="relative mx-auto block rounded-full transition-transform hover:scale-105"
      >
        <span className="block rounded-full ring-4 ring-superficie">
          <Avatar nombre={nombre} foto={foto} area={area} tamano="xl" />
        </span>
      </button>

      <p className="relative mt-6 text-balance text-xl font-semibold leading-snug sm:text-2xl">
        {elegirSaludo(nombre, semilla)}
      </p>

      <p className="relative mt-3 text-sm text-texto-suave">
        Cumple {edad} {edad === 1 ? "año" : "años"} · {fecha}
      </p>
    </section>
  );
}
