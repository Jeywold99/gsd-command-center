-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('HOURLY', 'FIXED');

-- AlterTable
ALTER TABLE "BillingRate" ADD COLUMN     "hoursPerWeek" DECIMAL(6,2),
ADD COLUMN     "type" "BillingType" NOT NULL DEFAULT 'HOURLY',
ALTER COLUMN "rate" DROP NOT NULL;
