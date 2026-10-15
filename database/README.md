# Shanghai PG environment

Environment: earth-online-d7g6gwyd46a788320 (ap-shanghai).

The console rejects the document database route as unavailable in this environment. Use `001-earth-world.sql` and the JS SDK `app.rdb().rpc('earth_world_sync', ...)` adapter instead of the legacy document-database cloud function. Do not rerun this one-time migration: the table and function were successfully created on 2026-10-15.

`earth_worlds` has RLS enabled and no direct PUBLIC/anon/authenticated grants. The SECURITY DEFINER RPC pins search_path to pg_catalog, checks auth.role(), auth.uid(), auth.email() and the anonymous claim before accessing data, and accepts no owner UID argument. A row lock and revision check prevent stale overwrites. The function validates payload shape and sizes before writing.

Verified in the real SQL editor in a transaction followed by ROLLBACK: anonymous rejection; denied client table grants; enabled RLS; write/read; conflict detection; invalid payload rejection; two simulated JWT identities isolated. These checks do not replace a real browser email login and two-device test.

Email OTP and email delivery are enabled. The current trial plan blocks adding the Sites origin to the Web safety-domain list and prompts for a paid upgrade. No upgrade purchased. The existing default static-hosting domain is already allowlisted but the console explicitly limits it to development/testing. Production Sites config stays disabled until origin access is resolved.

Legacy `cloudfunctions/earth-world` is retained for reference and is not used by the PG adapter.
