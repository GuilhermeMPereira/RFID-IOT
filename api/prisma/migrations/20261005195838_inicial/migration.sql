-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('AUDITOR', 'GESTOR');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('INICIAL', 'ANUAL', 'TRANSFERENCIA', 'EXTINCAO', 'EVENTUAL');

-- CreateEnum
CREATE TYPE "Desfecho" AS ENUM ('SUCESSO', 'TEMPO_ESGOTADO', 'ERRO_INTERFACE');

-- CreateTable
CREATE TABLE "Auditor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'AUDITOR',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambiente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Ambiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ativo" (
    "id" TEXT NOT NULL,
    "tombamento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ambienteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "ativoId" TEXT NOT NULL,
    "vinculadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadaEm" TIMESTAMP(3),

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventario" (
    "id" TEXT NOT NULL,
    "modalidade" "Modalidade" NOT NULL,
    "ambienteIds" TEXT[],
    "responsavelId" TEXT NOT NULL,
    "abertoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leitura" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "uidLido" TEXT NOT NULL,
    "etiquetaId" TEXT,
    "auditorId" TEXT NOT NULL,
    "ambienteId" TEXT NOT NULL,
    "desfecho" "Desfecho" NOT NULL,
    "mensagemErro" TEXT,
    "carimboCliente" TIMESTAMP(3) NOT NULL,
    "carimboServidor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispositivo" TEXT NOT NULL,
    "condicaoEnsaio" TEXT,
    "chaveIdempotencia" TEXT NOT NULL,

    CONSTRAINT "Leitura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalhe" JSONB NOT NULL,
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auditor_email_key" ON "Auditor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ambiente_codigo_key" ON "Ambiente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Ativo_tombamento_key" ON "Ativo"("tombamento");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_uid_key" ON "Etiqueta"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Leitura_chaveIdempotencia_key" ON "Leitura"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "Leitura_inventarioId_uidLido_idx" ON "Leitura"("inventarioId", "uidLido");

-- CreateIndex
CREATE INDEX "Evento_inventarioId_ocorridoEm_idx" ON "Evento"("inventarioId", "ocorridoEm");

-- AddForeignKey
ALTER TABLE "Ativo" ADD CONSTRAINT "Ativo_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etiqueta" ADD CONSTRAINT "Etiqueta_ativoId_fkey" FOREIGN KEY ("ativoId") REFERENCES "Ativo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Auditor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "Auditor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_ambienteId_fkey" FOREIGN KEY ("ambienteId") REFERENCES "Ambiente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Auditor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
