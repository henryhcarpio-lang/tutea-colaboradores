/**
 * Color estable por colaborador, para distinguir a personas de la misma área
 * en la cuadrícula de horarios (dos personas de "Operativo" ya no comparten
 * color). Determinista a partir del id: no cambia entre renders ni al
 * reordenar la lista, y funciona para cualquier cantidad de gente sin
 * mantener una paleta a mano.
 */
export function colorDePersona(id: string): { texto: string; fondo: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const tono = hash % 360;
  return {
    texto: `hsl(${tono} 65% 28%)`,
    fondo: `hsl(${tono} 70% 93%)`,
  };
}
