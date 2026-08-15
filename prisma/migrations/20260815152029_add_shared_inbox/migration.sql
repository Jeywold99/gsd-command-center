-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('RECEIVED', 'DRAFT', 'QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "externalId" TEXT,
    "clientId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "externalId" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'RECEIVED',
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmails" TEXT NOT NULL,
    "ccEmails" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "authorId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "needsReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailThread_externalId_key" ON "EmailThread"("externalId");

-- CreateIndex
CREATE INDEX "EmailThread_clientId_idx" ON "EmailThread"("clientId");

-- CreateIndex
CREATE INDEX "EmailThread_lastMessageAt_idx" ON "EmailThread"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_externalId_key" ON "EmailMessage"("externalId");

-- CreateIndex
CREATE INDEX "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");

-- CreateIndex
CREATE INDEX "EmailMessage_status_idx" ON "EmailMessage"("status");

-- CreateIndex
CREATE INDEX "EmailMessage_direction_isRead_idx" ON "EmailMessage"("direction", "isRead");

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
