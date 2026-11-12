import { requirePipelineAccess } from "@/lib/pipeline/access";
import { listAssets } from "@/lib/pipeline/queries";
import { AssetsManager } from "../_components/assets-manager";

export default async function AssetsPage() {
  const viewer = await requirePipelineAccess();
  const assets = await listAssets(viewer.personId);
  return <AssetsManager assets={assets} />;
}
