"use server";

import { revalidatePath } from "next/cache";
import { Area } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth";
import { hoyEnLima } from "@/lib/fecha";
import { LISTA_AREAS } from "@/lib/areas";
import { CLAVES_DIA, DIAS, validarDia, type BloqueSimple } from "@/lib/horarios";
import { sincronizarPeriodoContrato } from "@/lib/vacaciones-servidor";

export type EstadoColaborador = { error?: string; ok?: boolean };

const LIMITE_FOTO_BYTES = 300 * 1024;
const FORMATOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

/** Los campos que van a la fila del colaborador, tal cual. */
type CamposColaborador = {
  nombre: string;
  area: Area;
  fechaNacimiento: Date | null;
  fechaInicioContrato: Date | null;
  fechaFinContrato: Date | null;
  vidasMensualesDefault: number;
  foto: string | null;
};

/**
 * `diasVacaciones` va aparte porque no es una columna del colaborador: vive
 * en el período de vacaciones de su contrato vigente (`VacationPeriod`).
 */
type DatosValidados = CamposColaborador & { diasVacaciones: number };

/**
 * Valida en el servidor, no solo en el formulario: las acciones son un punto
 * de entrada público y el navegador puede mandar cualquier cosa.
 */
function validar(datos: FormData): DatosValidados | string {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (nombre.length < 2) return "El nombre es obligatorio.";
  if (nombre.length > 80) return "El nombre es demasiado largo.";

  const area = String(datos.get("area") ?? "");
  if (!LISTA_AREAS.includes(area as Area)) return "Elegí un área válida.";

  // La fecha es opcional: la planilla real del equipo no la tiene para todos,
  // y una fecha inventada dispararía un cumpleaños falso.
  const fechaTexto = String(datos.get("fechaNacimiento") ?? "").trim();
  let fechaNacimiento: Date | null = null;

  if (fechaTexto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
      return "La fecha de nacimiento no es válida.";
    }
    // Se arma en UTC a medianoche para que la columna `date` guarde exactamente
    // el día escrito, sin correrse por zona horaria.
    fechaNacimiento = new Date(`${fechaTexto}T00:00:00.000Z`);
    if (Number.isNaN(fechaNacimiento.getTime())) return "La fecha no es válida.";
    if (fechaNacimiento > hoyEnLima()) {
      return "La fecha de nacimiento no puede estar en el futuro.";
    }
    if (fechaNacimiento.getUTCFullYear() < 1940) {
      return "Revisá el año de nacimiento.";
    }
  }

  const vidas = Number(datos.get("vidasMensualesDefault"));
  if (!Number.isInteger(vidas) || vidas < 0 || vidas > 10) {
    return "El cupo de vidas tiene que ser un número entero entre 0 y 10.";
  }

  // Igual que la fecha de nacimiento: opcionales, porque no todos las tienen
  // cargadas todavía, y sin las dos no se le puede abrir ningún período de
  // vacaciones (§ Vacaciones — el cupo sale de la duración del contrato).
  function fechaContrato(campo: string, etiqueta: string): Date | null | string {
    const texto = String(datos.get(campo) ?? "").trim();
    if (!texto) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return `La fecha de ${etiqueta} no es válida.`;
    const fecha = new Date(`${texto}T00:00:00.000Z`);
    if (Number.isNaN(fecha.getTime())) return `La fecha de ${etiqueta} no es válida.`;
    if (fecha.getUTCFullYear() < 1990 || fecha.getUTCFullYear() > 2100) {
      return `Revisá el año de ${etiqueta}.`;
    }
    return fecha;
  }

  const fechaInicioContrato = fechaContrato("fechaInicioContrato", "inicio de contrato");
  if (typeof fechaInicioContrato === "string") return fechaInicioContrato;

  const fechaFinContrato = fechaContrato("fechaFinContrato", "fin de contrato");
  if (typeof fechaFinContrato === "string") return fechaFinContrato;

  if (fechaInicioContrato && fechaFinContrato && fechaFinContrato < fechaInicioContrato) {
    return "El fin de contrato no puede ser anterior al inicio.";
  }
  if ((fechaInicioContrato === null) !== (fechaFinContrato === null)) {
    return "Cargá el inicio y el fin de contrato juntos, o dejá los dos vacíos.";
  }

  // El cupo de vacaciones se propone por la duración del contrato, pero
  // gerencia puede pisarlo a mano desde la ficha; acá llega ya resuelto.
  const diasVacaciones = Number(datos.get("diasVacaciones"));
  if (!Number.isInteger(diasVacaciones) || diasVacaciones < 0 || diasVacaciones > 60) {
    return "Los días de vacaciones tienen que ser un número entero entre 0 y 60.";
  }

  const fotoCruda = String(datos.get("foto") ?? "").trim();
  let foto: string | null = null;
  if (fotoCruda) {
    const encabezado = /^data:([\w/+.-]+);base64,/.exec(fotoCruda);
    if (!encabezado || !FORMATOS_FOTO.includes(encabezado[1])) {
      return "La foto tiene que ser una imagen JPG, PNG o WebP.";
    }
    if (Buffer.byteLength(fotoCruda, "utf8") > LIMITE_FOTO_BYTES) {
      return "La foto es demasiado pesada. Probá con otra imagen.";
    }
    foto = fotoCruda;
  }

  return {
    nombre,
    area: area as Area,
    fechaNacimiento,
    fechaInicioContrato,
    fechaFinContrato,
    vidasMensualesDefault: vidas,
    foto,
    diasVacaciones,
  };
}

function refrescar() {
  revalidatePath("/colaboradores");
  revalidatePath("/horarios");
  revalidatePath("/cumpleanos");
  revalidatePath("/vidas");
  revalidatePath("/vacaciones");
  revalidatePath("/");
}

/**
 * El alta también acepta el horario, para no obligar a crear la persona y
 * después ir a otra pantalla a cargarle la semana.
 */
function validarBloques(crudo: string): BloqueSimple[] | string {
  if (!crudo) return [];

  let bloques: unknown;
  try {
    bloques = JSON.parse(crudo);
  } catch {
    return "No se pudo leer el horario. Volvé a intentarlo.";
  }
  if (!Array.isArray(bloques)) return "El horario no es válido.";
  if (bloques.length > 60) return "Demasiados bloques en la semana.";

  const limpios = bloques as BloqueSimple[];
  for (const b of limpios) {
    if (
      !CLAVES_DIA.includes(b?.diaSemana) ||
      !Number.isInteger(b?.horaInicioMin) ||
      !Number.isInteger(b?.horaFinMin) ||
      b.horaInicioMin < 0 ||
      b.horaFinMin > 24 * 60
    ) {
      return "Hay un bloque de horario con datos inválidos.";
    }
  }

  for (const dia of DIAS) {
    const error = validarDia(
      limpios.filter((b) => b.diaSemana === dia.clave),
      dia.etiqueta,
    );
    if (error) return error;
  }

  return limpios;
}

export async function crearColaborador(
  _previo: EstadoColaborador,
  datos: FormData,
): Promise<EstadoColaborador> {
  await exigirAdmin();

  const validado = validar(datos);
  if (typeof validado === "string") return { error: validado };

  const bloques = validarBloques(String(datos.get("bloques") ?? ""));
  if (typeof bloques === "string") return { error: bloques };

  const { diasVacaciones, ...campos } = validado;

  // Persona y horario se guardan juntos: si algo falla, no queda un
  // colaborador a medio crear.
  const creadoId = await prisma.$transaction(async (tx) => {
    const creado = await tx.collaborator.create({ data: campos });
    if (bloques.length === 0) return creado.id;

    await tx.scheduleBlock.createMany({
      data: bloques.map((b) => ({
        colaboradorId: creado.id,
        diaSemana: b.diaSemana,
        horaInicioMin: b.horaInicioMin,
        horaFinMin: b.horaFinMin,
      })),
    });
    // Mismo snapshot que escribe el editor de horarios, para que el historial
    // arranque desde la primera asignación.
    await tx.scheduleHistory.create({
      data: {
        colaboradorId: creado.id,
        horarioAnterior: [],
        horarioNuevo: CLAVES_DIA.flatMap((dia) =>
          bloques
            .filter((b) => b.diaSemana === dia)
            .sort((a, b) => a.horaInicioMin - b.horaInicioMin)
            .map((b) => ({
              diaSemana: dia,
              inicio: b.horaInicioMin,
              fin: b.horaFinMin,
            })),
        ),
      },
    });
    return creado.id;
  });

  // Fuera de la transacción: el período de vacaciones no debería impedir el
  // alta de la persona si algo sale mal.
  await sincronizarPeriodoContrato(
    creadoId,
    campos.fechaInicioContrato,
    campos.fechaFinContrato,
    diasVacaciones,
  );

  refrescar();
  return { ok: true };
}

export async function editarColaborador(
  _previo: EstadoColaborador,
  datos: FormData,
): Promise<EstadoColaborador> {
  await exigirAdmin();

  const id = String(datos.get("id") ?? "");
  if (!id) return { error: "Falta identificar al colaborador." };

  const validado = validar(datos);
  if (typeof validado === "string") return { error: validado };

  // Campo vacío al editar = "no cambiar la foto", no "borrar la foto".
  // Para sacarla hay un botón propio que manda quitarFoto.
  const quitarFoto = datos.get("quitarFoto") === "1";
  const { diasVacaciones, ...campos } = validado;
  const { foto, ...resto } = campos;

  await prisma.$transaction(async (tx) => {
    await tx.collaborator.update({
      where: { id },
      data: quitarFoto ? { ...resto, foto: null } : foto ? campos : resto,
    });

    // El cupo por defecto es la plantilla para meses futuros; sin esto, el
    // admin cambia el número acá y no ve ningún cambio en los corazones de
    // Vidas hasta el mes que viene, lo que parece que el campo "no hace
    // nada". Corregir el cupo del mes en curso es la corrección más obvia
    // cuando se edita el perfil, así que se sincroniza también.
    await tx.lifeMonthlyPeriod.updateMany({
      where: { colaboradorId: id, cerradoEn: null },
      data: { vidasAsignadas: validado.vidasMensualesDefault },
    });
  });

  // Mismo criterio con las vacaciones: si cambió el contrato, se archiva el
  // período viejo y se abre el nuevo en el acto, sin esperar a que alguien
  // entre a la pantalla de Vacaciones.
  await sincronizarPeriodoContrato(
    id,
    campos.fechaInicioContrato,
    campos.fechaFinContrato,
    diasVacaciones,
  );

  refrescar();
  return { ok: true };
}

/** Baja lógica: el historial de horarios y vidas apunta a estas filas. */
export async function desactivarColaborador(id: string): Promise<void> {
  await exigirAdmin();
  await prisma.collaborator.update({ where: { id }, data: { activo: false } });
  refrescar();
}

export async function reactivarColaborador(id: string): Promise<void> {
  await exigirAdmin();
  await prisma.collaborator.update({ where: { id }, data: { activo: true } });
  refrescar();
}
