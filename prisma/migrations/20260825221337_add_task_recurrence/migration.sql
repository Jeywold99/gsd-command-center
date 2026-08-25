-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recurrence" "RecurrenceFrequency",
ADD COLUMN     "recurrenceInterval" INTEGER;
