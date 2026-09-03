# Sistema de Gestión de Colaboradores — Tutea

## Especificación técnica para desarrollo (Claude Code)

---

## 1. Contexto

Tutea es una empresa peruana de asesoría e investigación científica (servicios de tesis). Actualmente no existe un control centralizado de los horarios de los colaboradores, que son muy variables entre sí (distintas horas de entrada, distinta cantidad de días a la semana, bloques con corte de almuerzo, etc.). Se necesita una plataforma interna que centralice:

1. Horarios de todos los colaboradores, con historial de cambios.
2. Sistema de "vidas" (permisos mensuales) por colaborador.
3. Cumpleaños de colaboradores, con avisos.

## 2. Usuarios y accesos

- **Acceso administrador**: un único usuario/clave, compartido entre las 4 personas de gerencia (Henry, su socia, y 2 personas más de gerencia/administración). Con esta cuenta se puede crear, editar y eliminar todo.
- **Vista pública**: acceso sin login, de solo lectura, para que los colaboradores consulten su horario, sus vidas disponibles y los cumpleaños del mes. No pueden editar nada.
  - Como es accesible para cualquiera con la URL, **no muestra el `motivo` de las vidas usadas** (dato sensible: puede ser un tema de salud o familiar). Solo el conteo de corazones. El motivo queda visible únicamente para el admin.
- No hay roles diferenciados más allá de estos dos (admin y lectura pública). Mantener el sistema simple, sin gestión de cuentas individuales.

**Es una aplicación web, no una app de escritorio ni una instalación local.** Vive en una URL pública que cualquier colaborador abre desde el navegador de su computadora o celular, sin instalar nada, sin crear cuenta y sin pedir permiso a nadie. La pantalla de inicio es la vista pública; el acceso de admin es una opción discreta dentro de ella. Es la ruta raíz `/` la que muestra la vista de solo lectura — no una sección escondida detrás del login.

## 3. Modelo de datos (sugerido)

### 3.1 Collaborator (Colaborador)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID/autoincrement | |
| nombre | string | |
| area | enum: `operativo`, `comercial`, `administrativo` | usada como etiqueta/filtro |
| foto | text | data URL base64 de la imagen, ya redimensionada (ver §3.7) |
| fecha_nacimiento | date nullable | Fecha completa: **día, mes y año** (ej. 1995-03-14). El año permite calcular y mostrar la edad; el día es imprescindible para el Entregable 6. **Es opcional**: la planilla real del equipo no la tiene para 8 de 19 personas, y una fecha inventada dispararía un cumpleaños falso. Quien no la tenga simplemente no participa del módulo de Cumpleaños, y la sección lista a quiénes les falta para que gerencia complete el dato. |
| vidas_mensuales_default | integer | cupo **por defecto** del colaborador (ej. Ronald=4, Henry=2, Evelyn=1). Es la plantilla con la que se abre cada mes; el cupo realmente vigente vive en `LifeMonthlyPeriod` (§3.6) |
| activo | boolean | para poder "eliminar" sin perder historial (soft delete recomendado) |
| creado_en | datetime | |

### 3.2 ScheduleBlock (Bloque de horario)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| colaborador_id | FK → Collaborator | |
| dia_semana | enum: lunes...sábado | la semana va de lunes a sábado; el domingo no se registra |
| hora_inicio | time | formato `HH:mm`, hora local de Lima |
| hora_fin | time | debe ser mayor que `hora_inicio`; los bloques del mismo día no pueden solaparse |

Un colaborador puede tener **varios bloques por día** (ej. lunes 8:00–13:00 y luego 15:00–19:00, para reflejar el corte de almuerzo), y **horarios distintos según el día de la semana**.

**Esta tabla guarda siempre el horario vigente, no versiones.** Al editar un horario los bloques se reemplazan en vivo, y la versión anterior queda registrada como snapshot en `ScheduleHistory` (§3.3). No se usa `vigente_desde`: mantener a la vez bloques versionados e historial de snapshots duplicaría la misma información en dos lugares y abriría la puerta a que se contradigan.

### 3.3 ScheduleHistory (Historial de horario)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| colaborador_id | FK → Collaborator | |
| fecha_cambio | datetime | |
| horario_anterior | JSON (snapshot completo de bloques) | |
| horario_nuevo | JSON (snapshot completo de bloques) | |

Cada vez que se modifica el horario de un colaborador, se guarda el snapshot completo anterior y el nuevo, no solo el campo que cambió. Esto permite reconstruir la evolución completa del horario de cada persona.

### 3.4 LifeMonthlyPeriod (Período mensual de vidas)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| colaborador_id | FK → Collaborator | |
| mes_periodo | string `YYYY-MM` (ej. "2026-09") | invariante de formato en todo el sistema |
| vidas_asignadas | integer | se inicializa desde `vidas_mensuales_default` al abrir el mes; los ajustes manuales del Entregable 5 modifican **este** campo, no el default del colaborador |
| abierto_en | datetime | |
| cerrado_en | datetime nullable | `null` = mes en curso; con valor = mes archivado |

Al cerrarse, el período queda como la foto histórica de ese mes: cupo que tuvo y, vía `LifeUsage`, las vidas que gastó. Reemplaza a la anterior tabla `LifeMonthlyClosing`.

**Puede haber más de un período para el mismo mes.** Un reinicio manual a mitad de mes cierra el vigente —que queda archivado íntegro, con sus usos— y abre uno nuevo. Lo único garantizado como único es el **período abierto por colaborador**, con un índice único parcial en Postgres (`WHERE cerrado_en IS NULL`). La restricción original por (colaborador, mes) habría obligado a borrar los usos para poder reiniciar, que es justo lo contrario de archivar.

**Por qué el cupo no vive en `Collaborator`:** el Entregable 5 permite ajustar el cupo a mitad de mes. Si ese ajuste tocara el campo del colaborador, cambiaría retroactivamente meses ya cerrados y no quedaría rastro de cuál fue el cupo real de cada mes.

### 3.5 LifeUsage (Uso de vida)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | |
| colaborador_id | FK → Collaborator | |
| periodo_id | FK → LifeMonthlyPeriod | el mes al que se imputa |
| fecha | date | |
| motivo | string | dato sensible: **no se expone en la vista pública** (§2) |
| registrado_en | datetime | |

Si un colaborador intenta usar una vida sin cupo disponible, el sistema **lo permite pero lo marca como excedido** (se muestra en rojo junto a los corazones y se cuenta aparte). Bloquear el registro haría que la realidad del permiso tomado quede sin registrar, que es peor para gerencia que verlo en negativo.

### 3.6 Reinicio mensual — cómo se dispara

No hay proceso en segundo plano. El cierre y apertura de mes se resuelven **de forma perezosa (lazy)**: en cada carga del módulo de Vidas, el sistema calcula el mes actual en zona horaria `America/Lima` y, si el período abierto de un colaborador corresponde a un mes anterior, lo cierra (`cerrado_en`) y abre el del mes corriente copiando `vidas_mensuales_default`. La operación es idempotente y se protege con la restricción de unicidad (colaborador, mes).

El botón de reinicio manual ejecuta exactamente la misma rutina, forzándola sobre el mes en curso.

Esto evita depender de cron jobs o de que alguien entre justo el día 1, y funciona igual en local que en producción.

### 3.7 Almacenamiento de fotos

La foto se elige en el formulario de colaborador y se procesa **en el navegador**:
se recorta al cuadrado central, se lleva a 400x400 y se exporta a JPEG calidad
0.8 (~30-50 KB). Lo que se guarda en `Collaborator.foto` es ese data URL base64,
dentro de la misma base de datos.

Con ~15 colaboradores el volumen es trivial, y evita depender de un servicio de
object storage y su token. **No se escribe al filesystem del servidor**: en
despliegue serverless ese disco es efímero y de solo lectura.

Restricciones: JPG/PNG/WebP en la entrada, y como máximo 300 KB ya
redimensionada (se valida también en el servidor).

### 3.8 Zona horaria

Toda fecha con significado de negocio (cumpleaños "de hoy", día de uso de una vida, corte mensual) se calcula en `America/Lima`. Los `datetime` se almacenan en UTC y se convierten al presentar. Sin esto, un servidor en UTC dispara el confeti de cumpleaños el día equivocado.

## 4. Entregables

### Entregable 1 — Base del sistema
- Estructura del proyecto (recomendación de stack más abajo).
- Base de datos Postgres provisionada con las tablas anteriores (migraciones versionadas).
- Autenticación simple: una sola clave de administrador (sin gestión de usuarios individuales).
- Layout general de la plataforma con navegación entre los 3 módulos: Horarios, Vidas, Cumpleaños.
- Vista pública de solo lectura (sin login) que replica horarios, vidas y cumpleaños pero sin controles de edición.

**Criterio de aceptación:** se puede entrar como admin con la clave, navegar entre secciones vacías, y acceder también a la vista pública sin clave.

### Entregable 2 — Colaboradores (CRUD)
- Crear colaborador: nombre, área (operativo/comercial/administrativo), foto de perfil (§3.7), fecha de nacimiento (día/mes/año), cupo de vidas mensuales por defecto.
- Editar colaborador.
- Eliminar colaborador (soft delete recomendado, para no romper el historial).
- Listado general de colaboradores con su foto como ícono.

**Criterio de aceptación:** se puede crear un colaborador completo, editarlo y eliminarlo, y su foto se ve como ícono redondo en el listado.

### Entregable 3 — Horarios
- Formulario para asignar horario semanal a un colaborador: por cada día (lunes a sábado), uno o más bloques de hora inicio–hora fin.
- Vista general tipo cuadrícula, con **dos formas de leer los mismos datos** y un selector para alternar:
  - **Por hora** (la que se abre por defecto): las horas en filas, los días en columnas, y en cada celda los colaboradores presentes en esa franja. Responde "¿quién está el martes a las 10?", que es la pregunta operativa de gerencia.
  - **Por colaborador**: colaboradores en filas, días en columnas, bloques de horario dentro de cada celda. Responde "¿cuándo trabaja Evelyn?".
- Filtro por colaborador.
- Filtro por área (operativo/comercial/administrativo).
- Ícono/foto del colaborador visible junto a su fila.

**Criterio de aceptación:** se puede armar el horario semanal completo de un colaborador con múltiples bloques por día, verlo en ambas vistas de la cuadrícula general, y filtrar por área o por colaborador específico.

### Entregable 4 — Historial de horarios
- Cada vez que se guarda un cambio de horario en el Entregable 3, se registra automáticamente en `ScheduleHistory` (horario anterior vs. nuevo, con fecha).
- Vista de historial por colaborador: lista cronológica de cambios, mostrando qué tenía antes y qué tiene ahora.

**Criterio de aceptación:** al cambiar el horario de un colaborador dos o tres veces en distintos momentos, se puede entrar a su historial y ver cada cambio con fecha, horario anterior y horario nuevo.

### Entregable 5 — Vidas (permisos)
- Vista tipo "juego": cada colaborador muestra su ícono/foto y una fila de corazones según su cupo mensual.
  - Corazón lleno, rojo brillante = vida disponible.
  - Corazón roto/oscuro = vida ya usada, con una pequeña animación al momento de gastarse.
- Al usar una vida: registrar fecha y motivo (`LifeUsage`). Si ya no queda cupo, se registra igual y se marca como excedido (§3.5).
- Botones junto a cada colaborador para ajustar manualmente su cupo de vidas (agregar o quitar). El ajuste afecta a `LifeMonthlyPeriod.vidas_asignadas` del mes en curso; existe además un campo separado en la ficha del colaborador para cambiar el cupo por defecto de los meses futuros.
- Cierre y apertura de mes automáticos por resolución perezosa (§3.6), sin cron.
- Botón de reinicio manual disponible en cualquier momento (ejecuta la misma rutina).
- Vista de historial de meses cerrados por colaborador: cupo asignado, vidas usadas y detalle de usos.

**Criterio de aceptación:** se puede ver el cupo de vidas de cada colaborador como corazones, marcar el uso de una vida (con fecha y motivo) y ver el corazón cambiar visualmente, ajustar el cupo manualmente, y disparar un reinicio manual que archive el mes.

### Entregable 6 — Cumpleaños
- Lista de cumpleaños del mes actual, con foto/ícono de cada colaborador, la fecha y la edad que cumple.
- Aviso destacado (banner o tarjeta resaltada) para cumpleaños que caen dentro de los próximos 7 días.
- El día exacto del cumpleaños: animación de celebración (confeti) al entrar a la plataforma, mencionando el nombre del colaborador.

**Criterio de aceptación:** si hay un colaborador que cumple hoy, al entrar a la plataforma se ve una animación de confeti con su nombre; si cumple dentro de la semana, aparece resaltado en la lista; el resto del mes aparece en la lista normal.

### Entregable 7 — Pulido UX/UI
- Revisión general de diseño: interfaz limpia, tipografía cuidada, paleta de colores coherente.
- Transiciones suaves entre vistas y al abrir/cerrar formularios.
- Micro-animaciones (hover en tarjetas, animación de corazones, confeti de cumpleaños).
- Diseño responsive (al menos usable en tablet/desktop; el uso principal es desde computadora).

**Criterio de aceptación:** la plataforma se siente cuidada visualmente, sin sensación de formulario crudo o interfaz por defecto.

## 5. Notas de diseño transversales

- Diseño con criterio de UX/UI: se busca una experiencia cuidada, no una interfaz genérica de CRUD.
- El ícono/foto de cada colaborador es un elemento visual central: se reutiliza en horarios, vidas y cumpleaños para dar coherencia visual.
- El sistema de vidas tiene una estética deliberadamente "de videojuego" (corazones), no debe sentirse como una tabla administrativa fría.

## 6. Sugerencia de stack técnico (ajustable por Claude Code)

- **Frontend/Backend**: Next.js (React) con TypeScript.
- **Estilos**: Tailwind CSS, para poder iterar rápido en el pulido visual del Entregable 7.
- **Base de datos**: PostgreSQL gestionado en **Supabase** desde el primer día, vía Prisma. Se usan sus dos cadenas de conexión: la *pooled* para consultar (`DATABASE_URL`) y la *directa* para migrar (`DIRECT_URL`).
  > **No usar SQLite.** El plan original la proponía "para desarrollo inicial", pero es incompatible con el despliegue en Vercel: allí el filesystem es efímero y de solo lectura, así que la base se perdería en cada deploy y no se compartiría entre invocaciones. Arrancar ya en Postgres evita una migración forzada a mitad del proyecto. Para desarrollo local se usa la misma base de Neon (rama de dev) o un Postgres en Docker.
- **Almacenamiento de imágenes**: base64 en la propia base (ver §3.7). No se puede escribir a disco.
- **Autenticación**: sesión simple basada en una clave de administrador guardada como variable de entorno (sin sistema de usuarios). La clave se compara con hash y la sesión va en cookie `httpOnly`.
- **Despliegue**: Vercel (Tutea ya tiene familiaridad con herramientas de automatización/infraestructura).
- **Zona horaria**: `America/Lima` fijada en la app, no heredada del servidor (ver §3.8).

Fuera de las tres restricciones marcadas arriba (Postgres, object storage, zona horaria), Claude Code puede ajustar el stack según lo que resulte más simple de mantener.

## 7. Orden de trabajo sugerido

Desarrollar y validar un entregable a la vez, en el orden 1 → 7, mostrando avance antes de continuar al siguiente. No avanzar al Entregable 3 sin tener el modelo de Colaboradores (Entregable 2) funcionando, ya que todo lo demás depende de él.
