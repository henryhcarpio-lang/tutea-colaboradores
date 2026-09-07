-- Calendario de eventos de la empresa, con estado que define el color en la
-- vista mensual. Es de solo lectura pública, como el resto del sistema; solo
-- el admin crea, edita y elimina.
CREATE TYPE "EstadoEvento" AS ENUM ('pendiente', 'en_desarrollo', 'finalizado');

CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" DATE NOT NULL,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_events_fecha_idx" ON "calendar_events"("fecha");

-- Mismo criterio que el resto de las tablas: RLS activo sin políticas, porque
-- Supabase publica el esquema público por su API REST con la clave anónima.
-- La app se conecta como dueño de las tablas, ajeno a RLS.
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
