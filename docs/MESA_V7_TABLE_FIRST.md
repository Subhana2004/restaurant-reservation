# Mesa V7 — Table First (experimental)

**Accepted baseline preserved:** `mesa-v6-paprika-2026`. This proposal lives only on `mesa-v7-table-first`. Production is unchanged.

## The concrete design problem

The accepted V6 Paprika & Butter interface had a strong brand and inviting food photography, but the first screen was largely hero content. Guests had to scroll past marketing, a three-step strip and an additional heading to interact with the actual table finder. All three sample restaurant cards also had equal visual weight, even though users first want to understand one place well and then compare alternatives.

## V7 product improvements

1. **First-screen table finder:** The exact same `#search-form`, date and UTC time inputs, group stepper and quick presets are relocated into a raised dock immediately under/overlapping the hero. Nothing was duplicated and the existing FastAPI API calls still govern availability and bookings.
2. **Live plan on hero photograph:** The former generic decorative image caption now reflects actual date, UTC time and guest count from the working form. It is marked as a plan, not a confirmed reservation.
3. **A distinctive restaurant collection:** On desktop the first matching place is a wide food-first feature with details/actions to the right; the other two use balanced columns. Search, sort, favourites and mood filters naturally change which place occupies the highlighted layout. On mobile it becomes a single consistent card stack.
4. **More confident visual rhythm:** Retains V6 paprika `#BD432B`, butter `#F5E6BF`, oat `#F8F7F2`, basil `#316A4C`; tightens spacing and makes the food/photo, date form and booking actions distinct in the first viewport.
5. **Useful motion only:** responsive photo hover, subtle buttons, semantic state feedback and reduced-motion support. No misleading reviews, invented venue photos, fake availability or fake reservations.

## Technical scope

- `static/v3/index.html`: moves the one true booking form, introduces live hero plan ids.
- `static/v3/table-first.css`: final V7 responsive composition layer; V6 original styles remain untouched on their branch.
- `static/v3/table-first.js`: real `date`, `time`, `guests` event reflection with requestAnimationFrame batching; no reservation-writing logic.
- `tests/test_v3.py`, `tests/browser/mesa.spec.cjs`, `.github/workflows/tests.yml`: static, real API and desktop/mobile browser verification.

## Assignment delivery

Local full demo: `pip install -r requirements.txt && uvicorn app.main:app --reload`, then open `http://127.0.0.1:8000/v3`. Vercel requires persistent `DATABASE_URL` to accept durable reservations. The project is a sample three-restaurant discovery/booking API demo; photographs illustrate cuisines, not real photos of the fictional sample venues.

**Deploy note:** New Vercel previews were rate-limited when this branch was made. This branch can still be inspected/tested through the GitHub Actions browser screenshots and run locally until Vercel's daily deployment window resets.