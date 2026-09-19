# Mesa 004 — Interactive Table Studio

## Why this is a rebuild rather than another landing-page recolour

The preceding Mesa V3 presented features as several marketing sections. Hallium V4's actual application structure in `sushan5140/hallium` shows a better product pattern: **a persistent path, a focused canvas and a stateful companion**. This Mesa pass adapts the interaction architecture, *not* Hallium's Korean-learning content or branding.

| Hallium | Mesa |
|---|---|
| Lesson path | Plan → Discover → Compare → My reservations |
| Sentence / practice canvas | Date, party, mood, slot and restaurant canvas |
| Adaptive coach | Reactive booking receipt and next action |
| Review | Saved confirmations and cancellations |
| Word map progress | Journey progress from actual user choices |
| Mobile navigation | Four-touch-target bottom navigation |

## Visual design system

**Direction: Porcelain + Cornflower.** An assignment-ready consumer app, not a terracotta-and-serif brochure. The light paper background and darker midnight rail create readable depth without neon. The primary cornflower blue signifies interaction, apricot highlights the invitation, jade signifies verified availability only, and amber signals storage/availability warnings.

| Semantic role | Value |
|---|---|
| Canvas | `#F4F5F1` |
| Surface | `#FFFFFF` |
| Main text | `#202638` |
| Muted copy | `#586073` |
| Journey rail | `#F4F5F1` |
| Primary action | `#4358BA` |
| Primary hover | `#31438F` |
| Selected surface | `#E8ECFC` |
| Warm companion highlight | `#ECA67F` |
| Verified success text | `#176B58` |
| Verified success surface | `#E1F3EC` |
| Preview/warning | `#925C35` on `#FEF2E5` |

Selected WCAG contrast ratios: ink on paper 13.74:1, muted on paper 5.75:1, white on primary 6.28:1, deep-primary on blue soft 7.65:1, success on jade soft 5.56:1, warning on warning soft 5.01:1. Check the rendered UI, especially tertiary small labels, on each device as well.

Typography: Manrope 800 for high-level headings, DM Sans for body/UI. Controls are a minimum of 44px where practical; keyboard focus is visible. Desktop has side panels, tablet places the companion below the canvas, mobile uses a bottom navigation. Repeated filters and keyboard search have no ornamental entrance animation. Occasional dialogs have subtle entrance motion; `prefers-reduced-motion` is respected.

## Skill application

- **Emil Kowalski**: only purposeful state/press motion, short transitions and an unobtrusive search shortcut.
- **Anthropic frontend-design**: product-specific structure, a distinct app feel, and a real task as the hero instead of another generic promotional page.
- **UI/UX Pro Max**: keyboard/focus/touch targets, predictable navigation, information hierarchy, loading/empty/preview states and responsive panels.
- **Material 3**: semantic colour roles, tonal surfaces, selected chips, soft elevation and adaptive layout.
- **Karpathy Guidelines**: preserve the booking API, isolate new functionality in `workspace.js/css`, add exact acceptance tests, avoid speculative backend routes.
- **Animate Skill + Design Motion Principles**: short transform/opacity feedback, strong ease-out, reduced-motion handling, no perpetual distracting marquee.
- **Design Engineering**: persistent workflow context, real data/state-driven UI, and a separate live companion instead of decorative cards.

The existing `.design-skills` git submodules and `docs/DESIGN_SKILLS.md` remain the pinned reference stack.

## Product walkthrough for submission

1. Open Mesa V4, choose a quick plan or exact date, UTC time and group size. Party chips update the real criteria and refresh API availability.
2. Choose a mood; cards react. Sort by name, capacity or verified remaining seats.
3. Save favourites locally. Add two restaurants to the compare tray, then open the comparison dialog; capacity and exact-slot availability are presented side by side.
4. Open venue details. If the backend is connected and confirms availability for the current criteria, confirm a reservation.
5. Open My tables; look up a booking by ID, cancel it or remove its ID from this browser.
6. Try the app on mobile; use bottom navigation and the same interaction flow.

The three sample restaurant identities are the seed data supplied by the assignment's API. These are **not real restaurant listings**. When deployed on Vercel without `DATABASE_URL`, the UI honestly labels the sample view and disables actual bookings; the demo state cannot generate confirmation IDs.

## Files and verification

`static/v3/index.html` provides the product structure. `static/v3/workspace.css` supplies the new visual system and responsive shell. `static/v3/workspace.js` derives journey progress and coach status, performs sorting and wires shortcuts and party chips. Existing `app.js`, `studio.js`, and `compare.js` retain backend integration, shortlist, alternate slots and compare flows.

`tests/test_v3.py` checks structure and asset routing; `tests/browser/mesa.spec.cjs` verifies the desktop/mobile flow against a real local SQLite-backed FastAPI instance in GitHub Actions. `node --check` validates all four V3 JavaScript files. Production branch/site stay untouched.
