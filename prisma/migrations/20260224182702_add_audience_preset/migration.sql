-- CreateTable
CREATE TABLE "AudiencePreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAudienceJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudiencePreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudiencePreset_userId_idx" ON "AudiencePreset"("userId");

-- AddForeignKey
ALTER TABLE "AudiencePreset" ADD CONSTRAINT "AudiencePreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
