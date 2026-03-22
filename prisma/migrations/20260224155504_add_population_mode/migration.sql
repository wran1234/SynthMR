-- AlterTable
ALTER TABLE "StudyRun" ADD COLUMN     "audienceLabel" TEXT,
ADD COLUMN     "populationMode" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "populationSize" INTEGER;
