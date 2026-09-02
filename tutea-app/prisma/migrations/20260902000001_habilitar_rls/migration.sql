-- Supabase publica el esquema `public` a través de PostgREST: sin RLS, cualquiera
-- con la clave anónima (que es pública por diseño) podría leer y escribir estas
-- tablas, incluidos los motivos de las vidas usadas, que el spec marca como dato
-- sensible que no debe salir de la vista de admin.
--
-- Se habilita RLS SIN políticas: eso bloquea por completo a los roles anon y
-- authenticated. La aplicación no se ve afectada porque Prisma se conecta con el
-- rol `postgres`, dueño de las tablas, que no está sujeto a RLS.

ALTER TABLE "collaborators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "life_monthly_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "life_usages" ENABLE ROW LEVEL SECURITY;
