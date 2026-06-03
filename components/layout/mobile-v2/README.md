# Mobile layout stable V2

Production uses **V1** (`AppChromeLayout`) unless:

```bash
NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2=true
```

## iPhone local test

1. Add the flag to `.env.local` (never enable on Netlify until approved).
2. `npm run dev` — use LAN URL on the phone, or Safari responsive mode.
3. Open `/debug/mobile-layout-v2` for route checklist.
4. Walk: `/home`, `/profile`, `/upload`, `/admin`, `/benefits`, `/explore`, `/challenges`.

## Design

- One `overflow-y: auto` scrollport (`data-mlv2-scroll`)
- Bottom nav in flex column (`data-mlv2-bottom-nav`) — not `position: fixed`
- No `AppMobileHeader` / top app menu on mobile
- Uniform content column (`max-w-md`, `--mlv2-top` padding)
- Styles live in `mobileLayoutStableV2.css` under `[data-mobile-layout-stable-v2]` only

## Branch

Work on `feature/mobile-layout-stable-v2`. Do not push or enable the flag in production without sign-off.
