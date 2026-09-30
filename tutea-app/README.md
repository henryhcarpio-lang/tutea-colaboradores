# Sistema de TH — Tutea

Sistema de Talento Humano, aplicación web interna: horarios, vidas (permisos
mensuales), vacaciones, cumpleaños, calendario y documentos del equipo. La especificación completa está en
[`../tutea-sistema-colaboradores-spec.md`](../tutea-sistema-colaboradores-spec.md).

## Estado

Los siete entregables están terminados. El sistema está listo para cargar al
equipo real y desplegarse.

## Cómo levantarlo

```bash
npm install
cp .env.example .env   # completar las tres variables
npx prisma migrate dev --name init
npm run dev
```

Queda en http://localhost:3000. La clave de admin es la que pongas en
`ADMIN_PASSWORD`.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión *pooled* de Supabase (puerto 6543), para consultar |
| `DIRECT_URL` | Conexión *directa* de Supabase (puerto 5432), para migrar |
| `ADMIN_PASSWORD` | Clave única de gerencia |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión |

Generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Base de datos

Postgres en Supabase. **No usar SQLite**: en Vercel el disco es efímero y de
solo lectura, así que la base se perdería en cada deploy.

El esquema vive en [`prisma/schema.prisma`](prisma/schema.prisma) y refleja §3
del spec. Las fotos se guardan como base64 dentro de la propia base: para ~15
personas es trivial y no hace falta ningún servicio de archivos. Los
documentos (RIT, MOF, modelos) también viven en la base, como bytes.

**Todas las tablas llevan RLS sin políticas** (`habilitar_rls`, y
`documentos_y_rls_vacaciones` para las que se agregaron después): Supabase
publica el esquema por PostgREST con una clave anónima que es pública por
diseño, y RLS sin políticas la deja sin acceso. La app no se ve afectada
porque Prisma se conecta con el rol `postgres`, dueño de las tablas. Toda
tabla nueva tiene que sumarse en su migración.

## Cómo está organizado

```
src/
├── app/
│   ├── page.tsx            Inicio (vista pública, sin login)
│   ├── horarios/           Cuadrícula semanal (dos vistas) y editor de horarios
│   │   └── historial/      Cambios de horario, con el antes y el después
│   ├── vidas/              Corazones, permisos y cierre mensual
│   │   └── historial/      Meses ya archivados
│   ├── cumpleanos/         Cumpleaños del mes y aviso de los próximos 7 días
│   ├── calendario/         Calendario mensual de eventos de la empresa
│   ├── vacaciones/         Quién está de vacaciones y, para admin, el saldo
│   │   └── historial/      Contratos cerrados, con sus goces (solo admin)
│   ├── documentos/         Políticas (RIT, MOF) y modelos para descargar
│   ├── colaboradores/      CRUD de colaboradores — única sección que exige admin
│   ├── ingresar/           Login de gerencia
│   └── api/                Salir de la sesión; servir fotos y documentos
├── components/
│   ├── navegacion.tsx      Barra superior; recibe si hay sesión admin
│   ├── avatar.tsx          Ícono redondo del colaborador (foto o iniciales)
│   ├── confeti.tsx         Saludo y confeti el día del cumpleaños
│   ├── insignia-area.tsx   Etiqueta de área con su color
│   └── seccion.tsx         Encabezado y estado vacío compartidos
└── lib/
    ├── prisma.ts           Cliente único de Prisma
    ├── auth.ts             Sesión de admin (cookie httpOnly firmada)
    ├── areas.ts            Áreas y sus colores de marca
    ├── horarios.ts         Días, conversión de horas y detección de solapamientos
    ├── historial.ts        Lectura y comparación de snapshots de horario
    ├── vidas.ts            Apertura y cierre perezoso de períodos mensuales
    ├── cumpleanos.ts       Edad, días que faltan y ventana de aviso
    ├── calendario.ts       Grilla de 6 semanas fijas y navegación entre meses
    ├── estado-evento.ts    Estados del calendario y su color
    ├── imagen.ts           Redimensionado de fotos a 400x400 en el navegador
    └── fecha.ts            Todo el manejo de America/Lima
```

## Identidad visual

Los colores y la tipografía salen del brandbook de Tutea: azul `#154DB2` y verde
`#22D166` como principales, verde `#029336` y azul marino `#002A66` como
secundarios, todo en Montserrat. Están centralizados como variables CSS en
[`globals.css`](src/app/globals.css): **cambia el color ahí, nunca en cada
componente**.

El verde claro tiene ~1.9:1 de contraste sobre blanco, así que se usa solo como
relleno o acento; para texto verde va el `#029336`.

La otra tipografía del brandbook, Averta, es comercial y no está en Google
Fonts. Si Tutea tiene la licencia y los `.woff2`, se suma como fuente local sin
tocar nada más.

Marketing y Gerencia (agregadas después del brandbook original) usan colores
fuera de esa paleta —rosa y dorado— porque ya no quedaba ningún tono de familia
sin repetir entre las cinco áreas.

## Cuadrícula de horarios: color por persona, no por área

En la vista "Por hora" cada barra usa un color propio del colaborador, de una
paleta de doce tonos elegidos a mano y repartidos cada ~30° del círculo
cromático (`src/lib/color-persona.ts`), no el color de su área: con varias
personas de la misma área en la misma franja, un solo color por área ya no
alcanzaba para distinguirlas, y un tono por hash tampoco garantizaba que dos
colores quedaran lo bastante separados como para no confundirse a simple
vista. La cuadrícula se sale del ancho de lectura de la página
(`cuadricula.tsx`) para aprovechar todo el monitor.

Cada barra ocupa un **carril**, no una columna fija por persona: se asignan
con el mismo algoritmo de "greedy interval scheduling" que usa cualquier
calendario (`asignarCarriles` en `vista-por-hora.tsx`), así que el número de
carriles de un día es exactamente su pico real de gente simultánea, ni uno
más. Además, cada barra lleva un halo del color de fondo de la página
(`box-shadow`) que la separa visualmente de sus vecinas aunque el carril de al
lado quede a un par de píxeles: sin ese halo, con diez o doce personas a la
vez el sábado a las 9, las fotos quedaban prácticamente pegadas.

## Tipo de permiso en Vidas

`LifeUsage.tipo` pinta el corazón gastado según el motivo: celeste con curita
para descanso médico, verde para desastre natural, y gris para los dos
motivos corrientes —permiso recuperable (se repone trabajando otro día) y
omitir una tardanza—, que se distinguen entre sí por el reloj que lleva
encima el de tardanza.

**Médico y desastre no descuentan del cupo** (`TIPOS_VIDA[tipo].descuentaCupo`,
en `src/lib/tipo-vida.ts`): una emergencia de salud o un desastre natural no
son una falta que la persona "gasta" de su cuenta, así que quedan registrados
—gerencia necesita el dato— pero no le cuestan una vida. Se dibujan aparte,
al final de la fila de corazones, con la nota "N sin descontar", y nunca
cuentan para el "N de más". Los otros tres tipos sí descuentan, porque ahí la
vida es justamente el permiso que la persona está usando. La cuenta vive en
`contarQueDescuentan()`, un solo lugar para que "cuáles descuentan" no se
decida distinto en cada pantalla.

`general` sigue existiendo en el enum pero **ya no se puede elegir**
(`LISTA_TIPOS_VIDA` no lo incluye): está solo para que los permisos viejos
registrados con ese motivo se sigan mostrando bien. Un dato ya guardado no se
reescribe, así que el tipo no se borra de la base.

Un corazón que pasa el cupo se pinta rojo oscuro **solo si su motivo es de
los grises que descuentan**; médico y desastre nunca llegan a "excedida" —no
descuentan, así que nunca agotan nada.

La estadística del mes (asignadas / usadas / disponibles / médico-desastre,
`src/app/vidas/resumen-vidas.tsx`) es **solo para admin**: es información de
gestión, no algo que el resto del equipo necesite ver en la portada del
módulo.

## Vacaciones

`VacationPeriod` es un **contrato**, no un año calendario ni un aniversario:
Tutea recontrata por tramos (6 meses, 1 año...), así que el cupo de cada
período sale de la duración de `Collaborator.fechaInicioContrato` /
`fechaFinContrato` (`src/lib/vacaciones.ts`, `diasPorDuracionDeContrato`) — 7
días hábiles cada 6 meses, 14 cada año, proporcional para otra duración. Sin
las dos fechas —opcionales, mismo criterio que `fechaNacimiento`— a la
persona no se le puede abrir ningún período; el módulo lo dice explícitamente
en vez de mostrar un saldo inventado, y si el contrato ya venció y nadie
cargó uno nuevo, lo dice también (en vez de mostrar el saldo vencido como si
siguiera vigente).

Cada vez que gerencia carga un contrato nuevo con fechas distintas en la
ficha del colaborador, `sincronizarPeriodoContrato()` archiva el período
anterior tal como quedó —con todo lo que usó— y abre uno nuevo con el cupo
que corresponda, al instante (la llama la propia acción de editar). Esos
períodos cerrados **son el historial completo de todos los contratos** que
tuvo la persona en la empresa, sin importar cuántas veces renovó; se ven en
`/vacaciones/historial`, igual que el mes cerrado de Vidas.

`asegurarPeriodosVacacion()` (perezoso, sin cron, en `src/lib/vacaciones-
servidor.ts`) es el barrido del resto: lo que no pasa por una edición, como
que un contrato venza solo con el correr de los días. Trae a todo el equipo
en dos consultas y decide en memoria quién necesita qué, en vez de llamar a
`sincronizarPeriodoContrato` una vez por persona en un `for` —así estaba
antes, y con el equipo completo eso eran decenas de idas y vueltas a la base
en cada carga de `/vacaciones`, la causa real de que la pantalla se sintiera
lenta.

Los días de un goce puntual, en cambio, se siguen contando **hábiles de
lunes a sábado** (`diasHabilesLimaSabado`) — una unidad distinta de la que
define el cupo del contrato, no el conteo legal de días calendario. Un
adelanto —tomarse más días de los que quedan— se registra igual y se marca
en la barra en vez de bloquear el registro, mismo criterio que un permiso
excedido en Vidas.

Cada goce guarda **los días como número fijo**, no los recalcula desde
`fechaInicio`/`fechaFin` al mostrarlo: si mañana cambia la regla de conteo, un
goce ya aprobado tiene que seguir diciendo lo que decía cuando se aprobó. El
formulario sí sugiere el valor automáticamente apenas se eligen las fechas,
pero queda editable para las excepciones.

**La vista pública solo dice si la persona está de vacaciones hoy.** Es lo
que el resto del equipo necesita saber (¿puedo contar con esta persona?): se
calcula con una sola consulta a los goces que empezaron y todavía no
terminaron, sin importar a qué contrato pertenezcan. Admin ve además hasta
qué día, la barra de saldo, las fechas del contrato, el detalle de cada goce
y el enlace al historial (`panel-vacaciones.tsx`) — el saldo no es un dato
que todos necesiten, solo gerencia.

**Aviso de contratos por vencer.** Sin cron ni correo: `RootLayout`
(`src/app/layout.tsx`) calcula, en cada carga de página y solo si hay sesión
de admin, quiénes tienen el contrato vigente a menos de 30 días de vencer
(`colaboradoresConContratoPorVencer()`) y lo muestra como un punto rojo con
el número, junto al ícono de Vacaciones en la barra de navegación — llega a
gerencia entre en la página que entre, igual que el saludo de cumpleaños. El
detalle completo (quién, cuándo) vive en un banner dentro de `/vacaciones`.

## Documentos

Dos secciones en `/documentos`: **políticas** (RIT, MOF), que son **solo de
lectura**, y **modelos** (solicitud de vacaciones, carta de renuncia), que se
descargan para completarlos. Todo el equipo los ve sin clave; solo admin sube
y elimina (`src/app/documentos/acciones.ts`, con confirmación al eliminar).

El archivo se guarda como bytes en la tabla `documentos` y se entrega por
`/api/documentos/[id]`. El listado nunca trae los bytes, solo título, tamaño y
extensión.

**Las políticas no se descargan.** Se suben solo en PDF y se leen en
`/documentos/[id]`, donde pdf.js (`visor-politica.tsx`) dibuja cada página en
un lienzo en vez de abrir el visor propio del navegador, que trae botones de
descargar e imprimir. Además: clic derecho bloqueado, al imprimir sale un
aviso en vez del documento, la API nunca las entrega como `attachment` (ni con
`?descargar=1`), no se guardan en caché, y abrir el enlace del archivo directo
en una pestaña (`Sec-Fetch-Dest: document`) redirige al visor. Esto frena la
descarga del uso normal; no es infalible: quien use las herramientas de
desarrollador o saque una captura puede quedarse con una copia, porque lo
que se ve en pantalla pasa por su navegador.

**Tope de 4 MB por archivo** (`TAMANO_MAXIMO_BYTES`, en `src/lib/documentos.ts`):
Vercel no acepta más de 4,5 MB por petición, y el límite de los server actions
se subió a ese número en `next.config.ts` (por defecto es 1 MB). Un PDF de
texto entra de sobra; un documento escaneado puede pasarse y hay que
comprimirlo antes. Si algún día hace falta subir archivos más grandes, el
camino es Supabase Storage con subida directa desde el navegador, no subir el
tope.

El tipo de archivo se decide por la **extensión**, no por lo que manda el
navegador: en Windows un .docx a veces llega sin tipo, y el tipo es lo que le
dice al navegador si puede abrirlo o tiene que descargarlo.

## Calendario de eventos

`CalendarEvent` es una tabla simple, sin relación a `Collaborator`: son eventos
de la empresa (feriados, campañas, hitos), no de una persona. Es de solo
lectura pública, como el resto del sistema; solo el admin crea, edita y borra.

La grilla mensual (`src/lib/calendario.ts`) siempre dibuja **6 semanas fijas**
(42 días), completando con días del mes anterior y siguiente, para que la
altura no salte al navegar entre un mes de 4 semanas y uno de 6. La consulta a
la base usa el rango de la grilla completa, no el del mes, así un evento
cargado en uno de esos días de relleno tampoco se pierde.

El estado (`pendiente` / `en_desarrollo` / `finalizado`) define el color de
cada evento en la vista — ver `src/lib/estado-evento.ts`. En desarrollo y
finalizado reusan el azul y el verde de marca; pendiente es el único color
nuevo del sistema (ámbar), porque ningún tono de marca transmitía "todavía no
arrancó".

## Cómo se guarda un horario

`ScheduleBlock` guarda siempre el horario **vigente**, nunca versiones. Al
guardar, la acción borra los bloques del colaborador y los vuelve a crear dentro
de una transacción, y deja la versión anterior como snapshot en
`ScheduleHistory`, que es lo que alimenta la vista de historial.

Los snapshots viven en una columna JSON, así que se **validan al leerlos**
(`src/lib/historial.ts`) en vez de confiar en el tipo: nada garantiza que una
fila vieja tenga la forma que espera el código de hoy.

Las horas se almacenan como **minutos desde medianoche** (un entero), no como
`time`: comparar bloques y detectar solapamientos queda en aritmética simple,
sin zonas horarias de por medio.

## Cómo funciona el mes de vidas

No hay cron ni proceso en segundo plano. Al entrar a Vidas, `asegurarPeriodos()`
cierra los períodos que quedaron abiertos en meses anteriores y abre el del mes
corriente. Es idempotente, así que correrlo en cada carga no molesta, y funciona
igual en local que en producción.

Un período cerrado **nunca se toca**: es la foto del mes. El reinicio manual
cierra el vigente y abre uno nuevo del mismo mes, sin borrar nada. Por eso puede
haber varios períodos por mes, y lo que es único es el período *abierto* por
colaborador — con un índice parcial de Postgres que Prisma no sabe expresar
(vive en la migración `habilitar_reinicio_manual`).

El `motivo` de cada permiso **no se envía al navegador** si no hay sesión de
admin. Ocultarlo con CSS dejaría el dato al alcance de cualquiera que abriera el
inspector.

## El saludo de cumpleaños

Vive en el layout, no en la sección de Cumpleaños: el spec pide que aparezca "al
entrar a la plataforma", sea cual sea la página por la que se entra. El confeti
se dispara **una vez por día y por navegador** (marca en `sessionStorage`);
repetirlo en cada navegación lo convertiría en una molestia. El saludo en sí se
muestra siempre y se puede cerrar.

Quien tiene `prefers-reduced-motion` activado recibe el saludo sin confeti.

## Accesibilidad y detalles de interfaz

El anillo de foco de teclado es el azul de la marca, definido una sola vez en
`globals.css` con `:focus-visible` — quien navega con el mouse no lo ve, quien
navega con teclado sí. Todas las animaciones y transiciones se apagan con
`prefers-reduced-motion`.

Cada sección tiene su propio `loading.tsx`: la base está en Oregon y desde Perú
cada consulta tarda unas décimas, así que sin el esqueleto la pantalla se
quedaba congelada en la sección anterior y parecía que el clic no había
funcionado.

## Dos decisiones que conviene no revertir

**Las rutas son las mismas para todos.** No hay un árbol `/admin` paralelo: cada
página consulta `esAdmin()` y decide si dibuja los controles de edición.
Duplicar las vistas garantizaría que la pública y la privada se desincronicen.

**Las fechas se calculan en `America/Lima`, nunca con la hora del servidor.**
Vercel corre en UTC; sin `src/lib/fecha.ts` el confeti de cumpleaños saldría un
día antes y el corte mensual de vidas caería fuera de lugar.
