-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'REMINDER';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VOICE_NOTE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "voiceNoteId" TEXT;

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "voiceNoteId" TEXT;

-- CreateTable
CREATE TABLE "VoiceNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'shortcut',
    "summary" TEXT NOT NULL DEFAULT '',
    "transcript" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "ideas" JSONB NOT NULL DEFAULT '[]',
    "reminders" JSONB NOT NULL DEFAULT '[]',
    "externalId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "voiceNoteId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNote_externalId_key" ON "VoiceNote"("externalId");

-- CreateIndex
CREATE INDEX "VoiceNote_userId_receivedAt_idx" ON "VoiceNote"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "Idea_userId_createdAt_idx" ON "Idea"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceKey_userId_key" ON "VoiceKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceKey_hashedKey_key" ON "VoiceKey"("hashedKey");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Task_voiceNoteId_idx" ON "Task"("voiceNoteId");

-- CreateIndex
CREATE INDEX "CalendarEvent_voiceNoteId_idx" ON "CalendarEvent"("voiceNoteId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceKey" ADD CONSTRAINT "VoiceKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

