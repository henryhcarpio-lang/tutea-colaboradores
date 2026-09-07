ALTER TABLE "collaborators"
  ADD COLUMN "fecha_ingreso" DATE,
  ADD COLUMN "dias_vacaciones_default" INTEGER NOT NULL DEFAULT 26;

CREATE TABLE "vacation_periods" (
  "id" TEXT NOT NULL,
  "colaborador_id" TEXT NOT NULL,
  "desde" DATE NOT NULL,
  "hasta" DATE NOT NULL,
  "dias_asignados" INTEGER NOT NULL,
  "abierto_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cerrado_en" TIMESTAMP(3),
  CONSTRAINT "vacation_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vacation_usages" (
  "id" TEXT NOT NULL,
  "colaborador_id" TEXT NOT NULL,
  "periodo_id" TEXT NOT NULL,
  "fecha_inicio" DATE NOT NULL,
  "fecha_fin" DATE NOT NULL,
  "dias" INTEGER NOT NULL,
  "observacion" TEXT,
  "registrado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vacation_usages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vacation_periods_colaborador_id_idx" ON "vacation_periods"("colaborador_id");
CREATE INDEX "vacation_usages_periodo_id_idx" ON "vacation_usages"("periodo_id");
CREATE INDEX "vacation_usages_colaborador_id_fecha_inicio_idx" ON "vacation_usages"("colaborador_id", "fecha_inicio");

ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacation_usages" ADD CONSTRAINT "vacation_usages_colaborador_id_fkey"
  FOREIGN KEY ("colaborador_id") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacation_usages" ADD CONSTRAINT "vacation_usages_periodo_id_fkey"
  FOREIGN KEY ("periodo_id") REFERENCES "vacation_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
