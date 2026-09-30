# GSD Shared Inbox — n8n Workflows

Two importable workflows that connect Jana's Gmail to the Command Center's
shared inbox. GSD is the system of record; n8n does the Gmail pull and push.

```
Inbound:   Gmail (Jana) ──▶ Classify & filter ──▶ POST /api/emails
Outbound:  every 1 min ──▶ GET /api/emails/outbox ──▶ Gmail send ──▶ POST /api/emails/{id}/sent
```

- `inbound-email-to-command-center.json` — new client/lead/update mail → GSD.
- `outbound-command-center-replies.json` — approved GSD replies → sent via Gmail.

## One-time setup

1. **Import** both JSON files into n8n (Workflows → Import from File).

2. **Connect Gmail.** Open each workflow, click the Gmail node(s), and select (or
   create) a **Gmail OAuth2** credential authorized on Jana's mailbox. The
   imported placeholder credential id must be replaced with your real one.

3. **Set two n8n environment variables** (Settings → Variables, or the n8n host's
   env) — this keeps the key out of the workflow JSON:
   - `GSD_BASE_URL` — where the Command Center is reachable *from n8n*
     (e.g. `http://192.168.100.26:3000`, or your Pi's URL in prod).
   - `GSD_API_KEY` — an inbound key minted in GSD at **Settings → Inbound API
     Keys** (copy the raw value once).
   - Optional: `GSD_INBOX_ADDRESS` — Jana's address, used as a `to` fallback.

4. **Activate** both workflows once you've tested them (toggle top-right).

## Tuning the filter

The inbound **Classify & filter** Code node forwards everything *except*
automated senders (`no-reply`, `mailer-daemon`, `notifications@`, …) and
OTP/2FA/verification mail. Edit the two regexes at the top of that node to fit
what actually lands in Jana's inbox.

Prefer manual control? Have Jana apply a Gmail label (e.g. `CommandCenter`) to
client mail and add a label filter on the **Gmail Trigger** node — then only
labeled mail is pulled and you can simplify the Code node.

## Payloads (already matched to the GSD API)

**POST `/api/emails`** (inbound) — idempotent on `externalId`:
```json
{ "externalId": "<gmail msg id>", "threadExternalId": "<gmail thread id>",
  "fromEmail": "maya@brightwave.io", "fromName": "Maya Chen",
  "to": "jana@…", "subject": "…", "bodyText": "…", "bodyHtml": "…",
  "receivedAt": "2026-08-15T09:12:00Z" }
```

**GET `/api/emails/outbox`** returns `{ "messages": [ { id, to, cc, subject,
bodyText, bodyHtml, threadExternalId, replyToMessageId } ] }`.
`replyToMessageId` is the Gmail message id the reply threads onto.

**POST `/api/emails/{id}/sent`** — `{ "externalId": "<gmail sent id>" }`. GSD
only flips a message that is still `QUEUED`, so a retry is safe (a second call
returns 404, never a double status change).

> Threading: the Gmail node uses the **reply** operation with
> `messageId = replyToMessageId`, so replies land inside the original Gmail
> conversation and go back to the sender automatically (no separate To/Subject
> needed). Every thread here originates from an inbound Gmail message, so
> `replyToMessageId` is populated. If you ever compose on a thread with no known
> Gmail message id, switch that node back to **send** (using `to`/`subject`).

## Test it end-to-end

1. **Inbound:** send a test email into Jana's mailbox (from another address).
   Within ~1 min the inbound workflow runs → the message appears in GSD at
   **/inbox**. (Run the workflow manually with *Execute Workflow* to skip the
   wait.)
2. **Outbound:** in GSD, open the thread, write a reply, and **Send** (Owner/
   Manager). It goes `QUEUED`. On the next tick the outbound workflow sends it
   via Gmail and the bubble flips to `Sent`.
3. Confirm the recipient received it, and that re-running doesn't double-send.

Both endpoints were verified directly against a live GSD before these workflows
were written, so if a run fails it's almost always the Gmail credential,
`GSD_BASE_URL` reachability from the n8n host, or the API key.

---

# Voice Notes — n8n → Command Center

Your existing **Voice Note Pipeline** (iPhone Shortcut → Groq Whisper → Groq
extract → Parse Note) gets one extra branch that sends the finished
transcription to the Command Center. No audio is sent — only the text and what
was extracted from it.

```
Shortcut (audio + voice_key) ──▶ Webhook ─▶ Transcribe ─▶ Extract ─▶ Parse Note ─┬─▶ Respond to Webhook
                                                                                  ├─▶ Google Calendar (unchanged)
                                                                                  └─▶ Log to Command Center ─▶ POST /api/voice-notes/ingest
```

The Command Center then, for the person whose voice key came with the recording:
- stores the transcription (private to them) in **Voice notes**,
- creates each **task** in their task inbox (assigned to them),
- turns each **timed reminder** into a task + a reminder notification + an
  event on their Command Center calendar (reminders without a time become plain tasks),
- adds each **idea** to their **Ideas** list,
- notifies them in the app.

## One-time setup

1. **Voice key (per person).** In the Command Center open **Profile → Voice key**,
   generate/copy your key. In the iPhone Shortcut, open **Get Contents of URL →
   Request Body (Form)** and add a **Text** field named `voice_key` with the key
   as its value. Each person uses their own key; that is what keeps
   transcriptions private.

2. **Add the node.** Open `voice-note-to-command-center.json`, copy its whole
   contents, and paste onto the Voice Note Pipeline canvas (Ctrl/Cmd+V). Drag a
   connection from **Parse Note** to **Log to Command Center** (a new parallel
   branch — leave Respond to Webhook connected directly to Parse Note).
   If your webhook node isn't named exactly `Webhook`, update the `x-voice-key`
   header expression to match.

3. **Variables** (same two the shared-inbox workflows use — skip if already set):
   - `GSD_BASE_URL` — where the Command Center is reachable from n8n.
   - `GSD_API_KEY` — an inbound key from **Settings → Inbound API Keys**.

4. **Remove Notion** once you've confirmed notes arrive: delete the Split
   Tasks / Has Due? / Notion: Task and Split Ideas / Notion: Idea branches.
   Keep Google Calendar if you still want reminders there too.

## Payload

The node forwards Parse Note's output plus three fields:

```json
{ "summary": "…", "transcript": "…", "notes": "",
  "tasks": [{ "title": "…", "due": "2026-10-02", "priority": "high" }],
  "ideas": [{ "idea": "…" }],
  "reminders": [{ "text": "…", "datetime": "2026-10-01T15:00:00+08:00" }],
  "source": "shortcut", "received_at": "<ISO>", "external_id": "<n8n execution id>" }
```

Headers: `x-api-key` (n8n inbound key) and `x-voice-key` (the recorder's voice
key). `external_id` makes a retried execution safe — the same note is never
created twice. Responses: `201 { id, tasks, reminders, ideas }`, `200` for a
duplicate, `401` for a bad/missing key, `400` for an empty note.
