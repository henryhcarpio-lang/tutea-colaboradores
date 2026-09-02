-- Un reinicio manual a mitad de mes tiene que poder cerrar el período vigente
-- (que queda archivado con sus usos, como pide el spec) y abrir uno nuevo del
-- MISMO mes. La unicidad por (colaborador, mes) lo impedía y habría obligado a
-- borrar el historial.
DROP INDEX IF EXISTS "life_monthly_periods_colaborador_id_mes_periodo_key";

CREATE INDEX IF NOT EXISTS "life_monthly_periods_colaborador_id_mes_periodo_idx"
  ON "life_monthly_periods" ("colaborador_id", "mes_periodo");

-- Lo que sí sigue siendo único: cada colaborador puede tener como máximo UN
-- período abierto. Es un índice parcial, que Prisma no sabe expresar en su
-- esquema; por eso se declara acá.
CREATE UNIQUE INDEX IF NOT EXISTS "life_monthly_periods_un_abierto_por_colaborador"
  ON "life_monthly_periods" ("colaborador_id")
  WHERE "cerrado_en" IS NULL;
