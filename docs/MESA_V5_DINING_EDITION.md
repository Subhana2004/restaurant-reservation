# Mesa V5 — Dining Edition

## Design direction

Mesa no longer imitates Hallium's three-panel app shell. The underlying *lesson* from Hallium is that a product should respond to user choices: filter, search, shortlist, compare, book, look up and cancel. The *visual vocabulary* for Mesa is now an independent dining editorial experience.

- Warm porcelain `#F9F7F2`: main page and quiet whitespace.
- Rich plum `#693A50`: active controls, booking CTAs and selected states.
- Near-black `#2A2427`: readable everyday content.
- Soft clay `#B57452`: restrained decorative accents.
- Jade `#276F5B`: **verified availability only**, not general decoration.
- Cream `#F0EBE5`: hero background.
- DM Serif Display for editorial display headings; DM Sans for task UI.

**Photo system:** realistic editorial food photography replaces the old childlike plates in the hero and all 3 sample restaurant cards, details modal and two-place comparison. Each source photo has a network-independent local SVG illustration fallback if an image request fails or the assignment runs offline. Photos are illustrative, not pictures of the sample venues' real dishes.

## Image credits & source links

Photo | Creator | License / source
--- | --- | ---
Hero close-up pasta (photo-1473093226795-af9932fe5856) | Eaters Collective | [Unsplash, free license](https://unsplash.com/photos/pasta-dish-on-white-plate-ddZYOtZUnBk)
Olive Garden Bistro pasta (photo-1607375658859-39f31567ce13) | Gabriella Clare Marino | [Unsplash, free license](https://unsplash.com/photos/a-plate-of-pasta-with-shrimp-and-tomatoes-zW65PndoBC0)
The Spice Table curry (photo-1603894584373-5ac82b2ae398) | Raman | [Unsplash, free license](https://unsplash.com/photos/brown-and-green-dish-on-brown-wooden-bowl-sqcH2q7lkvo)
Seaside Kitchen grilled fish (photo-1519708227418-c8fd9a32b7a2) | Caroline Attwood | [Unsplash, free license](https://unsplash.com/photos/grilled-fish-cooked-vegetables-and-fork-on-plate-bpPTlXWTOvg)

Unsplash images are requested responsively with crop, quality and size parameters. Local visual fallback keeps the page usable if a school network filters the Unsplash CDN.

## Implementation stages

1. Created an isolated `mesa-v5-editorial-dining` branch; left production and previous visual directions untouched.
2. Replaced illustrated hero and restaurant cards with visual assets suited to an editorial dining site. Used one shared catalogue so details and compare show the same food image.
3. Built a new `dining.css` colour/typography/layout layer loaded after the earlier styles. Retired the copied dashboard rails visually; introduced editorial horizontal process strip, large food hero, compact finder, occasion chips, photo-first restaurant collection and distinct footer.
4. Added `dining.js`: local photo fallbacks, accessible restaurant-photo details buttons, functional native-share/copy fallback and active navigation state.
5. Updated static and Chromium desktop/mobile tests. Backend reservation and capacity checks remain unchanged.

## Assignment demonstration

- Choose **Tomorrow for two** or **Weekend with friends**.
- Pick mood; change group and time; observe updated availability.
- View food photography and open the restaurant details from a card.
- Save and compare two places, confirm a table when the local API is available, open My Tables and cancel.

Local backend: `pip install -r requirements.txt && uvicorn app.main:app --reload`. Open `http://127.0.0.1:8000/v3`; `/docs` describes the FastAPI REST endpoints. The default local development database is SQLite, which supports complete demo booking. On Vercel a durable `DATABASE_URL` is required to enable actual bookings across serverless instances. With no database, the site displays an honest preview instead of pretending a reservation exists.

## Design reference application

The seven frontend-design skill repos informed concrete design decisions (visual hierarchy and typography, semantic colour roles, keyboard/motion accessibility, clear status feedback, reusable design tokens, separation of UI and API authority, responsive composition) rather than copying any other project's layout or colours. See `docs/DESIGN_SKILLS.md`.
