import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Sets up Nathan Lord's Command Center (nathan.<domain>). Safe to run more than
// once: it only adds what's missing and never overwrites edits.
//
//   npx tsx scripts/seed-nathan-portal.ts
//
// To also create Nathan's own login (he can change the password and turn on
// two-step verification under Settings):
//   NATHAN_EMAIL="nathan@example.com" NATHAN_PASSWORD="a-long-temporary-password" \
//     npx tsx scripts/seed-nathan-portal.ts
//
// On the live Pi (after deploying this version):
//   sudo docker compose exec -e NATHAN_EMAIL="..." -e NATHAN_PASSWORD="..." \
//     web npx tsx scripts/seed-nathan-portal.ts

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const SLUG = "nathan";

const BUSINESSES = [
  {
    name: "Shale Crescent USA",
    portalShort: "SCUSA",
    portalKind: "Nonprofit · President",
    portalColor: "#1E40AF",
    portalNote: "Nonprofit, never mixed with private businesses",
    workstreams: ["Events & Conferences", "Research & Prospect Lists", "LinkedIn & Content", "Admin & Executive Support", "Board & Governance"],
  },
  {
    name: "Tri-State Power",
    portalShort: "Tri-State Power",
    portalKind: "Private · role to confirm",
    portalColor: "#92400E",
    portalNote: "Confirm what the business does before taking on work",
    workstreams: ["Operations", "Customers", "Compliance & Renewals", "Finance & Billing", "Vendors"],
  },
  {
    name: "American Way RV Park",
    portalShort: "RV Park",
    portalKind: "Private · Owner",
    portalColor: "#065F46",
    portalNote: "Reviews answered within 48 hours",
    workstreams: ["Reservations & Guests", "Reviews", "Maintenance", "Rates & Listings", "Collections"],
  },
  {
    name: "Parkersburg Mobile Home Park",
    portalShort: "MHP",
    portalKind: "Private · Owner",
    portalColor: "#5B21B6",
    portalNote: "Formal notices go to attorney review first",
    workstreams: ["Residents & Applications", "Rent & Collections", "Maintenance", "Notices & Compliance", "Vacancies"],
  },
  {
    name: "Church",
    portalShort: "Church",
    portalKind: "Personal · ministry (incl. FMCI)",
    portalColor: "#9F1239",
    portalNote: "Billed and branded separately from SCUSA",
    workstreams: ["Services & Events", "Communications", "Ministry / Volunteer", "Admin", "Personal commitments"],
  },
];

type Seed = {
  biz: string;
  title: string;
  ws: string;
  month: string; // YYYY-MM
  due: string; // YYYY-MM-DD
  owner: "Jana" | "Eldwin";
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  next?: string;
  waitingOn?: string;
  chase?: string;
  ask?: "APPROVE" | "DECIDE" | "SIGN";
  outcome?: string;
  completed?: string; // YYYY-MM-DD
  details?: string;
  weekly?: boolean;
};

// Nathan's work as of Nov 13, 2026 (from the client dossier and the Oct 30 call).
const TASKS: Seed[] = [
  // ── SCUSA: LinkedIn board-member series ──
  {
    biz: "SCUSA", title: "Kickoff call with Nathan: board series, FMCI book, website", ws: "Admin & Executive Support",
    month: "2026-10", due: "2026-10-30", owner: "Jana", status: "DONE", completed: "2026-10-30",
    outcome: "28-minute call; three projects agreed, payment via Wise discussed",
  },
  {
    biz: "SCUSA", title: "Board-member LinkedIn series: 2–3 rough template concepts", ws: "LinkedIn & Content",
    month: "2026-11", due: "2026-11-20", owner: "Jana", status: "IN_PROGRESS",
    next: "Concept prompt drafted with SCUSA brand colours; finish 2–3 low-effort concepts",
    details: "One post every few weeks per board member: headshot, company logo and name, \"Board Member at Shale Crescent\", short blurbs, space for Nathan's note, member tagged. Clean and consistent, not flashy.",
  },
  {
    biz: "SCUSA", title: "Choose the template for the board-member series", ws: "LinkedIn & Content",
    month: "2026-11", due: "2026-11-25", owner: "Jana", status: "TODO",
    next: "Goes to Nathan to pick one once the concepts are ready",
  },
  {
    biz: "SCUSA", title: "Connect with Britt Froon (Steptoe & Johnson) on LinkedIn", ws: "Board & Governance",
    month: "2026-11", due: "2026-11-20", owner: "Jana", status: "IN_PROGRESS",
    next: "Nathan sends the connection request before the first post goes out",
    waitingOn: "Nathan", chase: "2026-11-18",
  },
  {
    biz: "SCUSA", title: "First board-member post: Britt Froon", ws: "LinkedIn & Content",
    month: "2026-12", due: "2026-12-04", owner: "Jana", status: "TODO",
    next: "Build the post from the chosen template; Nathan adds his personal note",
  },
  {
    biz: "SCUSA", title: "Website review: send feedback on the site Jana built", ws: "Admin & Executive Support",
    month: "2026-11", due: "2026-11-20", owner: "Jana", status: "IN_REVIEW", ask: "DECIDE",
    next: "Send feedback and content updates, and confirm: is this the interim SCUSA site or something separate?",
    details: "An outside firm will build a new SCUSA website later, so we're holding revision hours until this is confirmed.",
  },
  {
    biz: "SCUSA", title: "Newsletter upload", ws: "Admin & Executive Support",
    month: "2026-11", due: "2026-11-20", owner: "Jana", status: "TODO", weekly: true,
    next: "Upload this week's newsletter",
  },
  // ── Church: FMCI 2026 conference summary book ──
  {
    biz: "Church", title: "FMCI 2026: map each speaker's segment in the videos", ws: "Communications",
    month: "2026-11", due: "2026-11-09", owner: "Jana", status: "DONE", completed: "2026-11-09",
    outcome: "22 sections mapped; YouTube titles are wrong on 5 of 8 videos and one video isn't FMCI",
  },
  {
    biz: "Church", title: "FMCI 2026: write one section per speaker", ws: "Communications",
    month: "2026-11", due: "2026-11-09", owner: "Jana", status: "DONE", completed: "2026-11-09",
    outcome: "Drafts written for all 22 sections",
  },
  {
    biz: "Church", title: "FMCI 2026: speaker screenshots from the videos", ws: "Communications",
    month: "2026-11", due: "2026-11-20", owner: "Eldwin", status: "IN_PROGRESS",
    next: "Finish screenshots; two speakers joined by phone/Zoom and need photos",
  },
  {
    biz: "Church", title: "FMCI 2026: photos of the two remote speakers", ws: "Communications",
    month: "2026-11", due: "2026-11-20", owner: "Jana", status: "IN_PROGRESS",
    next: "Nathan sends photos of the two speakers who joined by phone/Zoom",
    waitingOn: "Nathan", chase: "2026-11-18",
  },
  {
    biz: "Church", title: "FMCI 2026 book: sensitive content and name spellings", ws: "Communications",
    month: "2026-11", due: "2026-11-20", owner: "Jana", status: "IN_REVIEW", ask: "DECIDE",
    next: "Decide what stays out (political remarks, dollar figures, personal/health remarks) and confirm the speaker name spellings",
  },
  {
    biz: "Church", title: "FMCI 2026: compile the final book with table of contents", ws: "Communications",
    month: "2026-11", due: "2026-11-27", owner: "Jana", status: "TODO",
    next: "Assemble once Nathan's decisions and photos are in",
    details: "Same format as the 2025 book: cover, contents, photo pages, then two pages per speaker. Theme: \"Building Your Sphere\".",
  },
];

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function findOwner(first: "Jana" | "Eldwin") {
  const u = await prisma.user.findFirst({
    where: { isActive: true, role: { not: "CLIENT" }, name: { startsWith: first, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  return u;
}

async function main() {
  // 1. The client record.
  let client = await prisma.client.findUnique({ where: { portalSlug: SLUG } });
  if (!client) {
    const existing = await prisma.client.findFirst({
      where: {
        OR: [
          { companyName: { contains: "Nathan Lord", mode: "insensitive" } },
          { companyName: { contains: "Shale Crescent", mode: "insensitive" } },
        ],
      },
    });
    client = existing
      ? await prisma.client.update({ where: { id: existing.id }, data: { portalSlug: SLUG, timezone: existing.timezone ?? "America/New_York" } })
      : await prisma.client.create({
          data: {
            companyName: "Nathan Lord",
            status: "ACTIVE",
            portalSlug: SLUG,
            timezone: "America/New_York",
            colorHex: "#1E40AF",
            serviceType: "Executive assistant (monthly)",
            website: "https://shalecrescentusa.com/",
          },
        });
    console.log(existing ? `Linked existing client "${client.companyName}" to the portal.` : `Created client "${client.companyName}".`);
  } else {
    console.log(`Client "${client.companyName}" already has the portal.`);
  }

  // 2. One project per business.
  const projects: Record<string, string> = {};
  for (const [i, b] of BUSINESSES.entries()) {
    let p = await prisma.project.findFirst({ where: { clientId: client.id, portalShort: b.portalShort } });
    if (!p) {
      p = await prisma.project.create({
        data: { ...b, clientId: client.id, status: "ACTIVE", portalOrder: i + 1, description: `${b.name} work for Nathan Lord (Command Center).` },
      });
      console.log(`  + business ${b.name}`);
    }
    projects[b.portalShort] = p.id;
  }

  // 3. Tasks (skipped when a task with the same title already exists there).
  const jana = await findOwner("Jana");
  const eldwin = await findOwner("Eldwin");
  if (!jana) console.warn("  ! No active team member named Jana; her tasks go to Eldwin. Reassign later.");
  const ownerFor = (o: "Jana" | "Eldwin") => (o === "Jana" ? (jana ?? eldwin) : (eldwin ?? jana));
  let added = 0;
  for (const t of TASKS) {
    const projectId = projects[t.biz];
    const exists = await prisma.task.findFirst({ where: { projectId, title: t.title } });
    if (exists) continue;
    const owner = ownerFor(t.owner);
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.details ?? null,
        projectId,
        status: t.status,
        workstream: t.ws,
        month: day(`${t.month}-01`),
        dueDate: day(t.due),
        nextAction: t.next ?? null,
        waitingOn: t.waitingOn ?? null,
        chaseDate: t.chase ? day(t.chase) : null,
        askType: t.ask ?? null,
        outcome: t.outcome ?? null,
        completedAt: t.completed ? new Date(`${t.completed}T21:00:00.000Z`) : null,
        recurrence: t.weekly ? "WEEKLY" : null,
        createdById: owner?.id ?? null,
        assignees: owner ? { create: [{ userId: owner.id }] } : undefined,
      },
    });
    await prisma.taskActivity.create({
      data: { taskId: task.id, userId: owner?.id ?? null, kind: "CREATED", text: "Added from the client dossier (Nov 13, 2026)" },
    });
    added++;
  }
  console.log(`  + ${added} task(s) added`);

  // 4. Nathan's own login (optional).
  const email = process.env.NATHAN_EMAIL?.trim().toLowerCase();
  const password = process.env.NATHAN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("NATHAN_PASSWORD must be at least 12 characters.");
    const found = await prisma.user.findUnique({ where: { email } });
    if (found && found.role !== "CLIENT") throw new Error(`${email} is a team account; use a different email for Nathan.`);
    if (found) {
      console.log(`Nathan's login (${email}) already exists; password not changed.`);
    } else {
      await prisma.user.create({
        data: { email, name: "Nathan Lord", role: "CLIENT", clientId: client.id, passwordHash: await bcrypt.hash(password, 12) },
      });
      console.log(`Created Nathan's login: ${email}. He can change the password under Settings.`);
    }
  } else {
    console.log("No NATHAN_EMAIL / NATHAN_PASSWORD given; Nathan's login not created.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
