-- Nuevas áreas pedidas por gerencia.
ALTER TYPE "Area" ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE "Area" ADD VALUE IF NOT EXISTS 'gerencia';

-- Tipo de permiso: distingue descanso médico y desastre natural del resto,
-- para que el corazón se pinte distinto según el motivo.
CREATE TYPE "TipoVida" AS ENUM ('general', 'medico', 'desastre');
ALTER TABLE "life_usages" ADD COLUMN "tipo" "TipoVida" NOT NULL DEFAULT 'general';
