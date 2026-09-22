# Events runbook — The Kickback (and future events)

PRD: `claude/PRD-KICKBACK-RSVP.md` (Rev 3, signed off 2026-09-22). Decisions D-090..D-097 in `docs/DECISIONS.md`.

## What's where

| Thing | Where |
|---|---|
| Public RSVP page | `/events/kickback` (`app/(public)/events/[slug]`) |
| Guest ticket (QR, cancel, unsubscribe) | `/events/kickback/ticket/<token>` |
| Admin: counts, settings, RSVP list, CSV | `/admin/events/kickback` |
| Admin: reminder schedule | `/admin/events/kickback/reminders` |
| Admin: check-in staff accounts | `/admin/staff` |
| Door check-in (phone) | `/checkin/kickback` |
| Background jobs | `/api/cron/event-jobs` (reminders, CRM retry, dispensary refresh) |
| Tables | `events`, `event_rsvps`, `event_reminders`, `event_reminder_sends`, `dispensaries`, `staff_roles` (website DB, RLS on, no policies) |
| PSM side | `docs/psm-side/W4-event-rsvp-ingest.md` |

## One-time setup (in order)

1. **Vercel env (Production + Preview):** `PSM_INGEST_TOKEN` (same value as PSM's `PS_INGEST_TOKEN`), `RESEND_WEBHOOK_SECRET`. `CRON_SECRET` and `RESEND_API_KEY` already exist. Redeploy.
2. **PSM side:** W4 steps 1–5 (migration, `crm_qr_codes` row, function secret, two Edge Functions). Paste the new `crm_qr_codes.id` into /admin/events/kickback → Event settings.
3. **Dispensary list:** /admin/events/kickback → "Refresh dispensary list from PSM" (expects ~274). The cron refreshes it daily after that.
4. **Resend:** the sender `events@privatestock.co` needs no new DNS (domain already verified). Webhooks → add `https://privatestock.co/api/webhooks/resend`, events `email.delivered`, `email.bounced`, `email.complained`; copy the signing secret into `RESEND_WEBHOOK_SECRET`.
5. **10-minute scheduler (website Supabase project `ihurvtxmcyahvtcydmnf`).** Vercel Hobby crons run once a day, so pg_cron calls the route instead:
   ```sql
   -- a) Store the secret (paste the CRON_SECRET value from Vercel; run this yourself so it never lands in chat/logs):
   select vault.create_secret('<CRON_SECRET value>', 'event_jobs_cron_secret');

   -- b) Extensions + job:
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select cron.schedule('event-jobs', '*/10 * * * *', $job$
     select net.http_get(
       url := 'https://privatestock.co/api/cron/event-jobs',
       headers := jsonb_build_object('Authorization', 'Bearer ' ||
         (select decrypted_secret from vault.decrypted_secrets where name = 'event_jobs_cron_secret')),
       timeout_milliseconds := 300000
     );
   $job$);
   ```
   Check it: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;` and `select status_code, content from net._http_response order by created desc limit 3;` (expect 200 + JSON).
   Stop it: `select cron.unschedule('event-jobs');`
6. **Check-in staff:** /admin/staff → add each door person (email + a password you hand them). They sign in at `/admin/login` → land on `/checkin/kickback`.
7. **Launch:** /admin/banners → the landing banner: badge `RSVP NOW`, link `/events/kickback`. Tell ROF the Zeffy link is replaced by `privatestock.co/events/kickback`.

## Pre-launch test (on production, then clean up)

1. RSVP as a general guest, as a budtender (pick from the list), and as a budtender with "not listed".
2. Confirm: confirmation emails arrive from "The Kickback", replies go to ambrose@; QR image loads; "Add to calendar" works on iPhone.
3. /admin/events/kickback: 3 RSVPs, "Not in CRM" = 0 within a minute; PSM `crm_contacts` shows them (W4 §6 query).
4. Reminders page → "Send test to me" on each reminder.
5. /checkin/kickback on a phone: scan a QR from the email, check in → badge → plate.
6. Cancel one via the email link; its plate frees up.
7. Clean-up (needs Ambrose's OK — it's a delete): remove test rows in the website DB and the matching PSM contacts/sign-ups.

## Day-of

- Door: `/checkin/kickback`, "Scan ticket QR". No signal? Search by name works on the same page; worst case, export the CSV from admin the night before and print it.
- Budtenders: check the IDFPR dispensary agent badge is valid and the name matches their photo ID → "IDFPR badge verified" → at the grill "Give BBQ plate". A plate can't be given before the badge step, and only once.
- Waitlisted budtenders show "no plate". If plates are left late in the day, release them from admin (/admin/events/kickback → Plate waitlist → Release plate); the guest gets an email.
- Walk-ups RSVP on their own phone at `/events/kickback` (print a QR sign; the PSM `kickback-2026` QR works), then get scanned in.

## Reminder defaults (editable)

| Name | When (CT) | Audience |
|---|---|---|
| One week out | Sun Oct 18, 10:00 | everyone confirmed |
| Day before | Sat Oct 24, 10:00 | everyone confirmed |
| Morning of | Sun Oct 25, 10:00 | everyone confirmed |
| Thank you | Mon Oct 26, 11:00 | checked in |

Recipients are resolved at send time; bounced addresses are skipped. A failed reminder shows the error and a Retry button (already-sent guests are skipped). SMS: off (no cannabis-compliant provider; Twilio/10DLC reject cannabis traffic).
