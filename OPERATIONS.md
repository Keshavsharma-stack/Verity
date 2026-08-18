# Verity — Production Operations & Recovery Guide

## 1. Application Health Check
- **Endpoint**: `GET /api/health`
- **Expected Response**: `{ "status": "ok", "timestamp": "2026-08-18T..." }`
- **Purpose**: Verifies that the Express backend container is up and responding to HTTP requests.

---

## 2. Common Failure Modes & Diagnostics

### A. AI Extraction Failure (`FAILED` status)
- **Symptoms**: Documents stuck in `PROCESSING` or showing `FAILED` status.
- **Root Cause**: Invalid PDF/image format, unreadable scan, missing `GEMINI_API_KEY`, or upstream Gemini API timeout.
- **Diagnostics**: Inspect container server logs for `[handleProcessExtraction]` error stacks. Verify `GEMINI_API_KEY` is present in server environment variables.
- **Recovery**: Re-upload document or trigger manual verification via the UI review queue.

### B. Email Delivery Failure
- **Symptoms**: Expiration reminders or system notifications not received by contractors/admins.
- **Root Cause**: Missing or invalid `RESEND_API_KEY` or SMTP credentials.
- **Diagnostics**: Check server logs for `[emailProvider]` dispatch errors. When credentials are unconfigured, system correctly logs configuration-required notices without throwing unhandled exceptions.
- **Recovery**: Configure valid `RESEND_API_KEY` or SMTP environment variables.

### C. Stripe Webhook Processing Failure
- **Symptoms**: Subscription state not updating after checkout or invoice payment.
- **Root Cause**: Missing `STRIPE_WEBHOOK_SECRET`, signature verification failure, or unhandled event type.
- **Diagnostics**: Check Stripe Dashboard Webhook logs and server logs for `[Stripe Webhook]` errors.
- **Recovery**: Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint secret in Stripe Dashboard; use idempotency checks (`stripe_events` table) to safely retry events.

### D. Database Connection / RLS Issues
- **Symptoms**: `403 Forbidden` or database query timeouts.
- **Root Cause**: Invalid JWT Bearer token or expired Supabase session.
- **Diagnostics**: Verify Supabase URL and Anon/Service Role keys. Inspect RLS policies in `supabase/schema.sql`.
- **Recovery**: Re-authenticate via login flow to refresh JWT tokens.

---

## 3. Log Inspection
- **Container Logs**: Stream container logs via Cloud Run or container management console.
- **Log Format**: Structured request IDs (`reqId=...`) are logged for all sensitive operations (`/api/documents/process-extraction`, `/api/reminders/process`, `/api/webhooks/stripe`).

---

## 4. Backup & Disaster Recovery
- **Database**: Managed by Supabase automated daily backups and Point-in-Time Recovery (PITR).
- **Storage**: Compliance documents stored in private Supabase Storage bucket (`documents`). Metadata securely tracked in relational tables (`documents`, `document_extractions`).
- **Accidental Deletion Recovery**: Restore via Supabase dashboard point-in-time recovery or database snapshots.
