# Sistema de Gestión de Colaboradores — Tutea

Aplicación web interna: horarios, vidas (permisos mensuales) y cumpleaños del
equipo. La especificación completa está en
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
personas es trivial y no hace falta ningún servicio de archivos.

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
│   ├── colaboradores/      CRUD de colaboradores — única sección que exige admin
│   ├── ingresar/           Login de gerencia
│   └── api/sesion/salir/   Cierre de sesión
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
[`globals.css`](src/app/globals.css): **cambiá el color ahí, nunca en cada
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

`LifeUsage.tipo` (`general` / `medico` / `desastre` / `recuperable` /
`tardanza`) pinta el corazón gastado según el motivo: celeste con curita para
descanso médico, verde para desastre natural, ámbar para un permiso
recuperable (se repone trabajando otro día, no es un día perdido de verdad) y
violeta con reloj para omitir una tardanza. Las cinco reducen el cupo por
igual — la etiqueta es solo para que gerencia vea de un vistazo por qué se
usó cada una. Vive en `src/lib/tipo-vida.ts`, junto a los colores.

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
ficha del colaborador, `asegurarPeriodosVacacion()` (perezoso, sin cron, en
`src/lib/vacaciones-servidor.ts`) archiva el período anterior tal como quedó
—con todo lo que usó— y abre uno nuevo con el cupo que corresponda. Esos
períodos cerrados **son el historial completo de todos los contratos** que
tuvo la persona en la empresa, sin importar cuántas veces renovó; se ven en
`/vacaciones/historial`, igual que el mes cerrado de Vidas.

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
