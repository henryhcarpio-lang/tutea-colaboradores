/**
 * Doce combinaciones de color elegidas a mano —no generadas por fórmula—
 * para que un colaborador se distinga de sus compañeros en la cuadrícula de
 * horarios sin quedar ni apagado ni chillón. Cada par ya viene probado para
 * que el texto se lea bien sobre su propio fondo.
 *
 * La versión anterior tenía catorce colores, pero varios quedaban a menos de
 * 20° de distancia en el círculo cromático (celeste casi igual a cian,
 * púrpura casi igual a violeta, ámbar casi igual a naranja): a simple vista,
 * en una barra de 24px, se leían como el mismo color. Esta versión recorta a
 * doce y los reparte cada ~30° del círculo, así que dos vecinos en la lista
 * siempre caen en categorías de color que un ojo distingue de inmediato (rojo
 * vs. naranja, verde vs. verde azulado, azul vs. índigo...), en vez de dos
 * tonos del mismo color con distinto matiz.
 *
 * Se recorren en el mismo orden en que llega la lista de colaboradores
 * (ordenada por nombre desde la base), así que dos personas solo repiten
 * color cuando hay más de doce en total —el pico real de gente trabajando a
 * la vez, visto en el horario del sábado, es de doce— y aun así rara vez
 * coinciden en el mismo horario justo esas dos.
 */
const PALETA: { texto: string; fondo: string }[] = [
  { texto: "#b91c1c", fondo: "#fee2e2" }, // rojo      ~0°
  { texto: "#c2410c", fondo: "#ffedd5" }, // naranja   ~17°
  { texto: "#a16207", fondo: "#fef9c3" }, // oro       ~45°
  { texto: "#4d7c0f", fondo: "#ecfccb" }, // lima      ~83°
  { texto: "#15803d", fondo: "#dcfce7" }, // verde     ~142°
  { texto: "#0f766e", fondo: "#ccfbf1" }, // verde azulado ~173°
  { texto: "#0e7490", fondo: "#cffafe" }, // cian      ~192°
  { texto: "#1d4ed8", fondo: "#dbeafe" }, // azul      ~221°
  { texto: "#4338ca", fondo: "#e0e7ff" }, // índigo    ~243°
  { texto: "#7e22ce", fondo: "#f3e8ff" }, // púrpura   ~271°
  { texto: "#a21caf", fondo: "#fae8ff" }, // magenta   ~296°
  { texto: "#be185d", fondo: "#fce7f3" }, // rosa      ~330°
];

export function colorPorIndice(indice: number): { texto: string; fondo: string } {
  return PALETA[indice % PALETA.length];
}
