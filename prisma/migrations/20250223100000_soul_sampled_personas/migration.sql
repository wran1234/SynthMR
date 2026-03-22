-- CreateTable
CREATE TABLE "SampledPersona" (
    "id" TEXT NOT NULL,
    "studyRunId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "soulVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampledPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoulEdit" (
    "id" TEXT NOT NULL,
    "sampledPersonaId" TEXT NOT NULL,
    "fromVersion" INTEGER NOT NULL,
    "toVersion" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoulEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SampledPersona_studyRunId_personaId_key" ON "SampledPersona"("studyRunId", "personaId");

-- CreateIndex
CREATE INDEX "SampledPersona_studyRunId_idx" ON "SampledPersona"("studyRunId");

-- CreateIndex
CREATE INDEX "SoulEdit_sampledPersonaId_idx" ON "SoulEdit"("sampledPersonaId");

-- AddForeignKey
ALTER TABLE "SampledPersona" ADD CONSTRAINT "SampledPersona_studyRunId_fkey" FOREIGN KEY ("studyRunId") REFERENCES "StudyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoulEdit" ADD CONSTRAINT "SoulEdit_sampledPersonaId_fkey" FOREIGN KEY ("sampledPersonaId") REFERENCES "SampledPersona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
