import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { taskPath } from "@/lib/task-path";
import TaskDetail from "../../projects/_components/task-detail";

// Inbox tasks (no project) — e.g. ones created from a voice note. A task that
// has a project redirects to its canonical page under the project.
export default async function InboxTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  await verifySession();
  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) notFound();
  if (task.projectId) redirect(taskPath(taskId, task.projectId, "tasks"));
  return <TaskDetail taskId={taskId} projectId={null} />;
}
