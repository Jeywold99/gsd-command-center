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
