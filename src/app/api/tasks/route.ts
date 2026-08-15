import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/apikey";
import { getSessionFromCookie } from "@/lib/api-auth";

// Accept either a valid n8n API key (x-api-key header) or a logged-in session.
async function authorized(request: Request): Promise<boolean> {
  if (await validateApiKey(request.headers.get("x-api-key"))) return true;
  return !!(await getSessionFromCookie())?.userId;
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: { include: { client: true } },
        assignees: { include: { user: true } },
      },
    });
    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST: create a task (used by n8n with x-api-key, or the app with a session).
export async function POST(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { title, description, status, projectId } = body;
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || "TODO",
        projectId: projectId || null,
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
