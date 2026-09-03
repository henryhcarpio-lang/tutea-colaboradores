-- La planilla real del equipo trae "No registrada" en 8 de 19 personas. Exigir
-- la fecha obligaría a inventarla, y una fecha inventada dispara un cumpleaños
-- falso. Mejor que el sistema admita el dato faltante y lo muestre como tal,
-- para que gerencia lo complete cuando lo tenga.
ALTER TABLE "collaborators" ALTER COLUMN "fecha_nacimiento" DROP NOT NULL;
