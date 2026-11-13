-- Every portal file is open to the client and the whole team; drop "only the client".
UPDATE "Document" SET "portalVisibility" = 'SHARED' WHERE "portalVisibility" = 'CLIENT_ONLY';

-- AlterEnum
BEGIN;
CREATE TYPE "PortalVisibility_new" AS ENUM ('SHARED');
ALTER TABLE "Document" ALTER COLUMN "portalVisibility" TYPE "PortalVisibility_new" USING ("portalVisibility"::text::"PortalVisibility_new");
ALTER TYPE "PortalVisibility" RENAME TO "PortalVisibility_old";
ALTER TYPE "PortalVisibility_new" RENAME TO "PortalVisibility";
DROP TYPE "public"."PortalVisibility_old";
COMMIT;

