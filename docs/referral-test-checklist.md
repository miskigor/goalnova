# Referral system — production test checklist

End-to-end flow the app implements:

1. Referrer opens `/benefits` and sees their invite link (`goalnova_player_referral_dashboard`).
2. Referrer copies or shares the link (does **not** change invite count).
3. Friend opens e.g. `/hr/signup?ref=CODE` — code is stored in `sessionStorage`, `localStorage`, and on signup in `auth.users.raw_user_meta_data.pending_referral_code`.
4. Friend registers with a **new** email (and confirms email if required).
5. After login, pending code is restored from storage or metadata.
6. Friend selects **Player** on `/role`; `player_profiles` row is created.
7. Client calls `goalnova_player_complete_referral(CODE)` with retries until success or a definitive reason.
8. Row appears in `public.player_referrals`; referrer’s invite count on `/benefits` increases by 1.

Copy/share alone never inserts a referral row — only a successful RPC after the referred user is a player with a profile.

---

## Manual test (production)

Use two browsers or one normal + one incognito window.

| Step | Actor | Action | Expected |
|------|--------|--------|----------|
| 1 | Referrer (player) | Log in, open `/benefits` | Referral code + invite link visible |
| 2 | Referrer | Copy link | Toast “link copied”; count unchanged |
| 3 | Friend | Open link with `?ref=CODE` | Signup page loads |
| 4 | Friend | Sign up with new email | Account created; after confirm/login → `/role` |
| 5 | Friend | Choose **Player** | Redirect to profile; referral consumed in background |
| 6 | Referrer | Refresh `/benefits` within ~30s | **Invited players: 1** (may need second refresh after RPC) |
| 7 | Referrer | Copy/share again | Count still **1** |

Optional: `/debug/referral` — **production:** staff/admin only; **development:** any logged-in user. Shows pending storage, last RPC result (dev localStorage only), retry button.

---

## SQL checks (Supabase SQL Editor)

Recent referral rows:

```sql
select * from public.player_referrals order by created_at desc limit 20;
```

Recent player profiles (referral codes / referred_by):

```sql
select id, full_name, username, referral_code, referred_by, created_at
from public.player_profiles
order by created_at desc
limit 20;
```

Manual RPC (as a logged-in user in the app, not in SQL Editor):

```sql
select public.goalnova_player_complete_referral('CODE')::text;
```

**Note:** In SQL Editor there is no `auth.uid()`, so this returns `not_authenticated` — that is normal. Test the RPC from the app (role selection, `/benefits`, or `/debug/referral` → Retry).

---

## Client: pending code lifecycle

| Outcome | Pending cleared? |
|---------|------------------|
| RPC `ok: true` (including `noop` / already referred) | Yes |
| Definitive `reason` (see below) | Yes |
| Temporary `reason` or transport error | **No** — retries (0s, 1s, 2s, 4s, 8s, 15s) |
| No pending code | N/A |

**Definitive reasons** (stop retrying, clear pending):

| Reason | Meaning |
|--------|---------|
| `invalid_code` | Missing/short code |
| `unknown_code` | No player owns that referral code |
| `self_referral` | User used their own code |
| `referral_only_for_new_accounts` | Legacy rule if old RPC still deployed |

**Temporary reasons** (keep pending, retry):

| Reason | Meaning |
|--------|---------|
| `not_authenticated` | No session |
| `no_player_profile` | Profile row not visible yet |
| `not_player_role` | User is not `player` yet |
| `no_current_user` | Session user missing |
| `session_missing` | Auth error |
| `rpc_transport` | Network/PostgREST error |

**Success `noop` reasons** (ok true, no new row): `already_referred`, `referral_exists`.

---

## Supabase migrations

Ensure these are applied on production (in order). If invite count stays 0 after a valid flow, run any missing file in **SQL Editor**:

| File | Purpose |
|------|---------|
| `20260510120000_player_referrals.sql` | Tables + base RPCs |
| `20260510210000_goalnova_player_complete_referral_self_reason.sql` | Self-referral reason |
| `20260510220000_referral_code_lookup_and_metadata.sql` | Metadata fallback in RPC |
| `20260510230000_player_referrals_referred_user_unique.sql` | One referral per referred user |
| `20260511130000_player_referrals_align_rules.sql` | Rules alignment |
| `20260516100000_referral_rpc_restore_metadata_lookup.sql` | Metadata lookup |
| `20260516120000_referral_allow_first_link_any_account_age.sql` | **Current** `goalnova_player_complete_referral` (no 30-day block) |

Latest RPC body lives in `supabase/migrations/20260516120000_referral_allow_first_link_any_account_age.sql`.

---

## Troubleshooting

- **Count 0 after friend signed up as Player:** Check `player_referrals` for `referred_user_id`. Open `/debug/referral` (staff) or dev tools → pending key `pitchrusch_pending_referral_code`.
- **Friend chose Scout:** Invite does not count (by design).
- **Same email / already referred:** RPC may return `noop`; count does not increase again.
- **Email confirmation:** Pending code must survive in `user_metadata` — verify `pending_referral_code` on `auth.users` for the new user.
