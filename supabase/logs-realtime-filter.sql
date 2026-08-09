-- Realtime probe-noise filter
-- Paste into Supabase Logs Explorer (source: realtime_logs) and save the query.
--
-- Background: an unauthenticated external scanner connects to
-- /realtime/v1/websocket and sends malformed/binary WebSocket frames, producing
-- server-side Jason decode errors:
--
--   UnknownErrorOnChannel: unexpected byte at position 0: 0x8F
--
-- All occurrences observed have `auth_user: null` (no valid session), so they
-- are NOT produced by the admin app (ayos-admin) or the consumer mobile app
-- (ayos-final) — both connect with an authenticated session. This query hides
-- that noise so real Realtime issues stay visible.

-- Real Realtime errors, excluding the probe-noise UnknownErrorOnChannel frames:
select
  cast(timestamp as datetime) as timestamp,
  event_message,
  metadata
from realtime_logs
where
  not regexp_contains(event_message, 'UnknownErrorOnChannel')
order by timestamp desc
limit 100;

-- To audit the probe itself (how often the scanner hits), flip the filter:
--   where regexp_contains(event_message, 'UnknownErrorOnChannel')
-- and note every row carries `auth_user: null` in metadata.
