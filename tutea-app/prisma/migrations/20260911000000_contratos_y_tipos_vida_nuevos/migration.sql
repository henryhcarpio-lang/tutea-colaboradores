ALTER TABLE "collaborators" RENAME COLUMN "fecha_ingreso" TO "fecha_inicio_contrato";
ALTER TABLE "collaborators" ADD COLUMN "fecha_fin_contrato" DATE;
ALTER TABLE "collaborators" DROP COLUMN "dias_vacaciones_default";

ALTER TYPE "TipoVida" ADD VALUE 'recuperable';
ALTER TYPE "TipoVida" ADD VALUE 'tardanza';
