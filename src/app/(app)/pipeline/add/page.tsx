import { requirePipelineAccess } from "@/lib/pipeline/access";
import { intakeConfigured } from "@/lib/pipeline/intake";
import { listPeopleNames } from "@/lib/pipeline/queries";
import AddFlow from "../_components/add-flow";

export default async function AddPage() {
  const viewer = await requirePipelineAccess();
  const people = await listPeopleNames();
  return (
    <AddFlow
      people={people.length ? people : [viewer.person]}
      defaultPerson={viewer.person}
      aiReady={intakeConfigured()}
    />
  );
}
