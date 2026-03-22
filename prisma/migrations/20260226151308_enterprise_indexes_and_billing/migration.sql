-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" TEXT,
ADD COLUMN     "planStatus" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "Aggregate_studyRunId_idx" ON "Aggregate"("studyRunId");

-- CreateIndex
CREATE INDEX "Study_userId_idx" ON "Study"("userId");

-- CreateIndex
CREATE INDEX "StudyRun_studyId_idx" ON "StudyRun"("studyId");
