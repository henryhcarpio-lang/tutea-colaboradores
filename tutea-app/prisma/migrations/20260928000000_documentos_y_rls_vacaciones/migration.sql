-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('politica', 'modelo');

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" "CategoriaDocumento" NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "contenido" BYTEA NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_categoria_idx" ON "documentos"("categoria");

-- Mismo criterio que la migración habilitar_rls: RLS sin políticas bloquea
-- a los roles anon y authenticated de PostgREST, y la app no se ve afectada
-- porque Prisma se conecta con el rol `postgres`, dueño de las tablas.
--
-- Las dos tablas de vacaciones se crearon sin esto (agregar_vacaciones) y
-- quedaron expuestas a la clave anónima; se corrige aquí.
ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vacation_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vacation_usages" ENABLE ROW LEVEL SECURITY;
