# Mesa V8 — Herb & Lime

This is the non-orange visual exploration requested after V7. Both accepted baselines remain intact:
- V6: `mesa-v6-paprika-2026`
- V7: `mesa-v7-table-first`
- V8: `mesa-v8-herb-lime` — separate design candidate; production is unchanged.

## Creative direction

Fresh, grounded, contemporary food discovery. No paprika, orange, clay or wine-coloured calls to action. The food photograph is allowed to supply natural warm colours; the surrounding interface stays distinct with herb green, lime freshness, crisp porcelain and a restrained aqua-teal for real availability. The featured restaurant content panel is now deep green, balanced against the pale herb hero and bright food photography.

### Semantic palette

| Role | Colour | Token |
| --- | --- | --- |
| Action and brand | Deep herb `#24513E` | `--primary` |
| Action hover | Dark herb `#193C2F` | `--primary-deep` |
| Distinctive accent | Lime `#D8ED91` | `--lime` |
| Hero | Pale herb `#E2ECCF`, `#EEF3DE`, `#E7F0D8` | `--hero-warm` / gradient |
| Page | Porcelain `#F8FAF5` | `--canvas` |
| Section | Pale eucalyptus `#EFF4E9` | `--occasion-warm` |
| Body text | Dark forest `#1D2922` | `--ink` |
| *Confirmed* availability | Aqua teal `#17696B` | `--status-ink` |
| Availability wash | `#E4F2F0` | `--status-surface` |
| Error/preview status | Muted plum `#7F4A5C` | `--warning` |

White text on primary exceeds 9:1; dark herb text on lime exceeds 7:1. Contrast for other UI states is additionally checked by browser screenshots and QA; availability is also expressed in words.

## Changed files

- `static/v3/dining.css`, `paprika.css`, `table-first.css`: shared token replacements and existing hard-coded orange/tan controls corrected. The older stylesheets still carry historical filenames, but their **V8 contents** no longer use the old paprika theme.
- `static/v3/herb-lime.css`: last-loaded final semantic brand layer; nav, form, hero, photo label, filter states, featured restaurant, compare, modal and mobile affordances.
- `static/v3/favicon.svg` and `index.html`: green/lime icon and browser theme.
- Python and Playwright: check CSS delivery, semantic palette, featured dark card and mobile controls.

## Assignment limitation

Photos illustrate fictional sample venues, not real restaurants. The actual local SQLite API runs confirmed demo bookings, lookup and cancellation. A persistent `DATABASE_URL` is necessary for durable serverless Vercel booking; without it preview mode is disclosed, never pretended.


Preview deployment request: branch-specific preview requested on 20 September 2026; no change to accepted source or reservation behaviour.

Branch-specific Vercel preview deployment retry after V7 reached READY; code, styling and tested reservation behaviour unchanged.

Deployment request: V8 herb-lime branch preview refreshed after the Subhana account's rolling Vercel limit window, keeping V7 and production unchanged.
