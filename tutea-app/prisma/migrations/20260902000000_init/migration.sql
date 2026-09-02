-- CreateEnum
CREATE TYPE "Area" AS ENUM ('operativo', 'comercial', 'administrativo');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado');

-- CreateTable
CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" "Area" NOT NULL,
    "foto" TEXT,
    "fecha_nacimiento" DATE NOT NULL,
    "vidas_mensuales_default" INTEGER NOT NULL DEFAULT 2,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_blocks" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "dia_semana" "DiaSemana" NOT NULL,
    "hora_inicio_min" INTEGER NOT NULL,
    "hora_fin_min" INTEGER NOT NULL,

    CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_history" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horario_anterior" JSONB NOT NULL,
    "horario_nuevo" JSONB NOT NULL,

    CONSTRAINT "schedule_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_monthly_periods" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "mes_periodo" VARCHAR(7) NOT NULL,
    "vidas_asignadas" INTEGER NOT NULL,
    "abierto_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado_en" TIMESTAMP(3),

    CONSTRAINT "life_monthly_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_usages" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collaborators_activo_idx" ON "collaborators"("activo");

-- CreateIndex
CREATE INDEX "schedule_blocks_colaborador_id_dia_semana_idx" ON "schedule_blocks"("colaborador_id", "dia_semana");

-- CreateIndex
CREATE INDEX "schedule_history_colaborador_id_fecha_cambio_idx" ON "schedule_history"("colaborador_id", "fecha_cambio");

-- CreateIndex
CREATE INDEX "life_monthly_periods_mes_periodo_idx" ON "life_monthly_periods"("mes_periodo");

-- CreateIndex
CREATE UNIQUE INDEX "life_monthly_periods_colaborador_id_mes_periodo_key" ON "life_monthly_periods"("colaborador_id", "mes_periodo");

-- CreateIndex
CREATE INDEX "life_usages_periodo_id_idx" ON "life_usages"("periodo_id");

-- CreateIndex
CREATE INDEX "life_usages_colaborador_id_fecha_idx" ON "life_usages"("colaborador_id", "fecha");

-- AddForeignKey
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_history" ADD CONSTRAINT "schedule_history_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_monthly_periods" ADD CONSTRAINT "life_monthly_periods_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_usages" ADD CONSTRAINT "life_usages_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_usages" ADD CONSTRAINT "life_usages_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "life_monthly_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

