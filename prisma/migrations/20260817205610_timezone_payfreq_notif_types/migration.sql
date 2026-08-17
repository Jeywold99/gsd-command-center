-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CREATED';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "payFrequency" "PayFrequency",
ADD COLUMN     "timezone" TEXT;
