-- CreateEnum
CREATE TYPE "PortalVisibility" AS ENUM ('SHARED', 'CLIENT_ONLY');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CLIENT';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "portalSlug" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "portalVisibility" "PortalVisibility";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "portalColor" TEXT,
ADD COLUMN     "portalKind" TEXT,
ADD COLUMN     "portalNote" TEXT,
ADD COLUMN     "portalOrder" INTEGER,
ADD COLUMN     "portalShort" TEXT,
ADD COLUMN     "workstreams" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "askType" TEXT,
ADD COLUMN     "chaseDate" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "month" DATE,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "waitingOn" TEXT,
ADD COLUMN     "workstream" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "TaskActivity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalLogin" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "service" TEXT NOT NULL,
    "sharedWith" TEXT NOT NULL,
    "twoFactor" BOOLEAN NOT NULL DEFAULT false,
    "lastChangedAt" TIMESTAMP(3),
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalAccessLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalLogin_clientId_idx" ON "PortalLogin"("clientId");

-- CreateIndex
CREATE INDEX "PortalAccessLog_clientId_createdAt_idx" ON "PortalAccessLog"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalSlug_key" ON "Client"("portalSlug");

-- CreateIndex
CREATE INDEX "Document_portalVisibility_idx" ON "Document"("portalVisibility");

-- CreateIndex
CREATE INDEX "Task_month_idx" ON "Task"("month");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalLogin" ADD CONSTRAINT "PortalLogin_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalLogin" ADD CONSTRAINT "PortalLogin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccessLog" ADD CONSTRAINT "PortalAccessLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccessLog" ADD CONSTRAINT "PortalAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

