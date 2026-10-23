# Astra signed evidence history pagination

The signed evaluation verifier previously fetched 200 newest completed runs before testing Astra suite identity; unrelated Blackstar evaluations could therefore hide legitimate older cases. The verifier now filters run metadata for the exact `server_verified` Astra suite, task class, compatible provider and pinned candidate model inside the owner-scoped database query before stable `(completed_at,id)` pagination.

It examines bounded pages until the matching history is exhausted and throws a clear error at the safety limit rather than silently treating missing older cases as certification failures or success. Every fetched row still passes the existing owner, signed HMAC, score-link, independent judge and quality-floor verification.

This change reads only; it does not issue evidence, migrate the database, set credentials, bypass approval controls or modify Production.
