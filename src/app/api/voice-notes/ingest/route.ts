import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apikey";
import { resolveVoiceKey, ingestSchema, ingestVoiceNote } from "@/lib/voice";

// Voice-note ingestion. n8n's "Voice Note Pipeline" POSTs its Parse Note output
// here (JSON, no audio). Two keys are required:
//   x-api-key    an inbound n8n key from Settings → Inbound API Keys (proves
//                the caller is our n8n)
//   x-voice-key  the recording user's personal voice key (says whose note it
//                is); may instead be sent as `voice_key` in the body
//
// Expected JSON body (all optional except that something should be in it):
//   summary, transcript, notes          strings
//   tasks      [{ title, due: "YYYY-MM-DD"|null, priority: "high"|"medium"|"low" }]
//   ideas      [{ idea }]
//   reminders  [{ text, datetime: ISO 8601 with offset | null }]
//   source     "shortcut" (default)
//   received_at  ISO timestamp
//   external_id  e.g. the n8n execution id — makes retries idempotent

const MAX_BYTES = 1_000_000;

export async function POST(request: Request) {
  if (!(await validateApiKey(request.headers.get("x-api-key")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const voiceKey =
    request.headers.get("x-voice-key") ??
    (typeof body.voice_key === "string" ? body.voice_key : null);
  const userId = await resolveVoiceKey(voiceKey);
  if (!userId) {
    return NextResponse.json({ error: "Unknown or missing voice key" }, { status: 401 });
  }

  const payload = ingestSchema.parse(body);
  if (!payload.transcript && !payload.summary) {
    return NextResponse.json({ error: "transcript or summary is required" }, { status: 400 });
  }

  try {
    const result = await ingestVoiceNote(userId, payload);
    return NextResponse.json(result, { status: result.deduped ? 200 : 201 });
  } catch (error) {
    console.error("Voice note ingest error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
