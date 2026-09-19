# Mesa 004 — Interactive Reservation Studio

> An assignment-ready restaurant reservation application, designed as a coherent product experience instead of a static marketing page.

## What it demonstrates

Mesa is a FastAPI reservation API + browser UI. A visitor can set an exact UTC date and time and guest count, explore sample venues, search and filter, shortlist places locally, inspect capacity/available seats, compare two restaurants, book if the API is connected, then look up or cancel reservations. The backend serializes capacity checks and does not intentionally oversell a slot.

In this version, the interface becomes a **three-part workspace**:

1. **Journey rail** — actionable progression through planning, discovery, comparison and reservation management. Progress is derived from actual UI or stored booking state, never fabricated completion.
2. **Task canvas** — a compact hero and functional controls, followed by live restaurant cards. No login wall; the API remains the source of truth.
3. **Companion rail** — a live booking recap, mood, results, saved favourites and an actionable next step. On narrow screens, its controls remain accessible via a four-item bottom nav and normal content.

The product is intentionally described as a *sample collection*. Sample venue names/images are illustrative and must not be marketed as real businesses. If a Vercel deployment lacks persistent storage, the UI says **preview only**, and disables booking rather than claiming success.

## Colour theory — Porcelain & Cornflower

Role | Token | Hex | Where
--- | --- | --- | ---
Canvas | `--canvas` | `#F4F5F1` | Low-noise background
Surface | `--surface` | `#FFFFFF` | Primary input/card areas
Ink | `--ink` | `#202638` | Headlines, body text, clear hierarchy
Primary | `--primary` | `#4358BA` | Search, selected journey step, actionable buttons
Primary soft | `--primary-soft` | `#E8ECFC` | Hero, live companion receipt, selected controls
Warm personality | `--apricot` | `#ECA67F` | Small highlights and brand mark
Warm surface | `--apricot-soft` | `#FAE8DA` | Optional mood studio
Available | `--jade` | `#247D67` | Verified seats, successful status only
Available surface | `--jade-soft` | `#E1F3EC` | Verified availability/next-step panels
Warning | `--warning` | `#925C35` | Honest unavailable/preview states

Base scheme: restrained neutral canvas and white content surfaces, one primary interaction colour, one small warm counterpoint, semantic colour for API-driven states. Avoid a generic orange button in every component or a huge dark hero.

**Implementation note:** the older `styles.css`, `studio.css` and `compare.css` remain to preserve original contracts. `workspace.css` is the last loaded stylesheet and holds the V4 semantic theme/layout. New UI should use the V4 tokens above, not introduce another standalone palette.

## How the skills were applied

- Emil Kowalski / Design Engineering: high-frequency controls respond immediately; gentle, optional motion for occasional dialogs and feedback; no decorative scroll choreography.
- Anthropic frontend-design: restaurant subject matter informs the copy, illustration and booking flow; reject one-size-fits-all marketing templates.
- UI/UX Pro Max: accessible labels, keyboard operation, mobile-first touch targets, visible loading/preview/disabled states, consistent responsive shell.
- Material 3: surface hierarchy, distinct primary vs semantic status colours and touch-friendly controls.
- Karpathy guidelines: preserve tested API contracts, modify in stages, avoid fake data/state and remove contradictory behaviour.
- Animate and Design Motion Principles: roughly 140–220ms transform/opacity transitions where they explain the response, while respecting `prefers-reduced-motion`.
- AgentsORG design-engineering: design for the actual task, not visual decoration; keep state and copy consistent.

References are pinned as repository submodules under `.design-skills`, see `docs/DESIGN_SKILLS.md`.

## Local assignment demonstration

```bash
python -m venv .venv
# Activate your environment
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/v3` or the standalone branch's home route. Local SQLite is created automatically. Full API docs are at `/docs`.

Demo script: choose tomorrow for two, switch to a different group size, select a mood, search a restaurant, shortlist it, compare two options, open details, confirm an available table, open My Tables and cancel the reservation. The `/health` endpoint describes storage status.

## Deployment caveat

A Vercel serverless instance must **not** use ephemeral SQLite for real bookings. Set a valid persistent `DATABASE_URL` (PostgreSQL) in the Vercel project settings and redeploy. Without it, the preview is still a legitimate frontend demonstration but live booking is intentionally unavailable.

## Quality gates

```bash
python -m pytest -q
node --check static/v3/app.js
node --check static/v3/studio.js
node --check static/v3/compare.js
node --check static/v3/workspace.js
```

The GitHub workflow also runs Chromium-based desktop and mobile journey tests with a real local API. Screenshots and failures are retained as browser-test artifacts.

## Submission explanation

> “I redesigned a static restaurant-reservation site into a three-pane reservation workspace. The UI communicates each stage of the task, retains the selected booking context while browsing, offers local shortlisting and two-place comparison, and connects to a transaction-checked FastAPI booking service. Its colour roles distinguish navigation, actions and verified availability. It is responsive, keyboard accessible and honest about disabled booking states.”
