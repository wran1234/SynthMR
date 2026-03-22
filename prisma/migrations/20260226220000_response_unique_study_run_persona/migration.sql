-- CreateIndex: one Response per (studyRunId, personaId) for idempotency on retries
CREATE UNIQUE INDEX "Response_studyRunId_personaId_key" ON "Response"("studyRunId", "personaId");
