// Canonical URL of a task's detail page. Project tasks live under their
// project; inbox tasks (no project — e.g. created from a voice note) under
// /tasks. Dependency-free so client components and the worker can use it.
export function taskPath(taskId: string, projectId?: string | null, from?: "tasks") {
  const base = projectId ? `/projects/${projectId}/tasks/${taskId}` : `/tasks/${taskId}`;
  return from && projectId ? `${base}?from=${from}` : base;
}
