import {
  CalendarClock,
  Cake,
  Heart,
  House,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Los módulos del sistema, con su ícono. Viven acá para que la barra de
 * navegación y la portada no se desincronicen.
 *
 * Todos los íconos son de trazo (line/outline), sin relleno sólido: es el
 * estilo que se usa en todo el sistema.
 */
export type Modulo = {
  href: string;
  etiqueta: string;
  detalle: string;
  Icono: LucideIcon;
  soloAdmin: boolean;
};

export const MODULOS: Modulo[] = [
  {
    href: "/",
    etiqueta: "Inicio",
    detalle: "",
    Icono: House,
    soloAdmin: false,
  },
  {
    href: "/horarios",
    etiqueta: "Horarios",
    detalle:
      "El horario semanal de cada colaborador, de lunes a sábado, con sus bloques y cortes de almuerzo.",
    Icono: CalendarClock,
    soloAdmin: false,
  },
  {
    href: "/vidas",
    etiqueta: "Vidas",
    detalle:
      "Los permisos disponibles del mes, en corazones. Se reinician solos al empezar cada mes.",
    Icono: Heart,
    soloAdmin: false,
  },
  {
    href: "/cumpleanos",
    etiqueta: "Cumpleaños",
    detalle:
      "Quién cumple años este mes, y un aviso destacado cuando el día se acerca.",
    Icono: Cake,
    soloAdmin: false,
  },
  {
    href: "/colaboradores",
    etiqueta: "Colaboradores",
    detalle:
      "Alta, edición y baja del equipo. Todo lo demás depende de esta sección.",
    Icono: Users,
    soloAdmin: true,
  },
];

/** Los que se muestran como tarjetas en la portada (Inicio no se incluye). */
export const MODULOS_PORTADA = MODULOS.filter((m) => m.href !== "/");
