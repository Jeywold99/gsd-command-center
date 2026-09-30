import TaskDetail from "../../../_components/task-detail";

export default async function ProjectTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id, taskId } = await params;
  const { from } = await searchParams;
  return <TaskDetail taskId={taskId} projectId={id} from={from} />;
}
