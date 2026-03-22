-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "clientMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_threadId_clientMessageId_key" ON "ChatMessage"("threadId", "clientMessageId");
