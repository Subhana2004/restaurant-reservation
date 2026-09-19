# Mesa V6 — Paprika & Butter / 2026 Food-First Design

This is a new, distinct visual identity for a food-focused reservation assignment. It keeps the tested FastAPI booking, availability, filter, search, shortlist, compare, sharing and cancellation behaviour.

## Why the V5 wine palette was replaced

V5 had excellent photography but used a muted plum as its dominant action colour, a retro serif for every heading and repeated oval pills. Together those choices made a restaurant booking interface feel like an older lifestyle template. V6 gives the photographs a newer, lively product frame, with less visual nostalgia and stronger information hierarchy.

## Semantics / core tokens

| Purpose | Colour |
| --- | --- |
| Product canvas, calm neutral | `#F8F7F2` |
| Clear content/card surface | `#FFFFFF` |
| Main text / end section | `#27271F` / `#252923` |
| **Paprika action** (button, active mood, selected filter, compare) | **`#BD432B`** |
| Paprika hover/pressed | `#98311F` |
| Action-tint backgrounds | `#FDEAE2` |
| **Butter hero** (food anticipation) | **`#F5E6BF`** |
| Quiet oat mood-planning surface | `#F3EFE3` |
| Toasted-gold small accents | `#D47740` |
| Basil status: verified available only | `#316A4C` on `#E7F1E7` |

Contrast checks for *intended pairings*: white text on paprika 5.25:1; white text on dark paprika >8:1; dark ink on butter >12:1; basil on status wash >5:1. Colour is not the only state indicator: availability text and disabled controls remain explicit.

## Product decisions

- The hero has a lively Plus Jakarta Sans headline and a small italic DM Serif accent, not an entire page set in a vintage serif.
- The hero image now sits in a clean, contemporary asymmetric rounded rectangle with restrained food-card label; no huge arched picture frame.
- Navigation, presets, filters, mood states and calls to action use consistent paprika, not competing decorative colours.
- Food photography stays front and centre; cards have clearer typography, softer layers, responsive image crop and a practical Explore action.
- Form labels, booking controls and state indicators remain keyboard-usable; reduced-motion settings disable decorative movement.
- Warm butter/white/oat sections create hierarchy; dark forest-charcoal close gives the page a strong finish without a neon UI.

## Architecture & assignment caveat

The new appearance is in `static/v3/paprika.css`, the final loaded stylesheet. `static/v3/dining.css` has its earlier wine tokens and explicit accents updated, so this is not just a single primary-colour hex swap. Earlier stylesheets are kept for the tested API/UI contracts and the ability to compare iterations. The project remains accessible at `/v3`; the previous versions and production branch remain untouched.

Food photographs illustrate three **sample venues**, not real restaurants. The local SQLite demo supports confirmed bookings, lookups and cancellations; Vercel needs a persistent `DATABASE_URL` for durable reservations. Without persistent storage the site explicitly remains a functional preview/discovery demo rather than pretending to book real tables.
