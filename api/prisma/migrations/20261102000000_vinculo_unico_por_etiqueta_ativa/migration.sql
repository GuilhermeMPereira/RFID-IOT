-- O UID deixa de ser unico na tabela: uma etiqueta revogada pode ser
-- vinculada de novo, e o historico de vinculos precisa sobreviver.
DROP INDEX IF EXISTS "Etiqueta_uid_key";

CREATE INDEX IF NOT EXISTS "Etiqueta_uid_idx" ON "Etiqueta"("uid");

-- O que continua unico e o vinculo ATIVO: no maximo uma etiqueta nao
-- revogada por UID. Indice unico parcial, que o Prisma nao declara no
-- schema mas o PostgreSQL aplica.
CREATE UNIQUE INDEX IF NOT EXISTS "Etiqueta_uid_ativa_key"
  ON "Etiqueta"("uid") WHERE "revogadaEm" IS NULL;
