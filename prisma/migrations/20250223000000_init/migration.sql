-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ideaText" TEXT NOT NULL,
    "geography" TEXT NOT NULL DEFAULT 'US',
    "industry" TEXT,
    "pricePoints" DOUBLE PRECISION[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRun" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "populationManifestPath" TEXT,
    "sampleSize" INTEGER NOT NULL DEFAULT 500,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobId" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "studyRunId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "studyRunId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "buys" JSONB NOT NULL,
    "objections" JSONB NOT NULL,
    "valueScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aggregate" (
    "id" TEXT NOT NULL,
    "studyRunId" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudyRun_jobId_key" ON "StudyRun"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_studyRunId_key" ON "Survey"("studyRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Aggregate_studyRunId_key" ON "Aggregate"("studyRunId");

-- CreateIndex
CREATE INDEX "Response_studyRunId_idx" ON "Response"("studyRunId");

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRun" ADD CONSTRAINT "StudyRun_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_studyRunId_fkey" FOREIGN KEY ("studyRunId") REFERENCES "StudyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_studyRunId_fkey" FOREIGN KEY ("studyRunId") REFERENCES "StudyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aggregate" ADD CONSTRAINT "Aggregate_studyRunId_fkey" FOREIGN KEY ("studyRunId") REFERENCES "StudyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
