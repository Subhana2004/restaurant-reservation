# Mesa V3 — Tomato & Linen color system

The previous Mesa had a forest-green hero, green type, green controls and terracotta decoration competing with one another. This revision uses a clear **warm restaurant / product UI** hierarchy.

## Color roles

| Role | Token / color | Application |
|---|---|---|
| Main background (60%) | `--cream: #F9F6F0` | Page and discovery surface |
| Surface / cards | `--paper: #FFFEFA` | Header, restaurant cards, inputs, dialogs |
| Warm feature surface (part of 30%) | `#F4E5D5` | Hero and closing, never for white-on-pale text |
| Interactive studio | `#F3E8DC` | Distinguishes optional discovery without visual noise |
| Main text / secondary CTAs | `--ink: #292722` | Headings, body emphasis, dark sections, booking card actions |
| Supporting text | `--muted: #6B6259` | Secondary descriptions, navigation, labels |
| Brand & primary CTA (up to 10%) | `--red: #AD432E` | Highlight words, primary search/confirm, saved state |
| Primary hover | `--red-dark: #8E3223` | Primary button hover |
| Outlines | `--line: #E6DDD2` | Inputs, cards, dividers |
| Semantic success (not brand) | `#316F4A` | Real availability only, never generic decoration |
| Success surface | `#EAF1E9` | Verified available seat status |

Keep new colors tied to roles rather than hard-coding a new green/terracotta variation per component. The legacy `--green` and `--green-dark` tokens are temporarily aliases for espresso ink to preserve existing selector contracts; future refactors should rename them to semantic `--ink` / `--ink-strong`.

## Contrast — calculated WCAG ratios

- Ink `#292722` on linen `#F9F6F0`: **13.83:1**
- Muted copy `#6B6259` on linen `#F9F6F0`: **5.54:1**
- White `#FFFEFA` on tomato `#AD432E`: **5.75:1**
- Tomato `#AD432E` on warm hero `#F4E5D5`: **4.70:1**
- Success `#316F4A` on success surface `#EAF1E9`: **5.21:1**

These intended text pairs pass the WCAG AA normal-text contrast threshold of 4.5:1. Contrast is not a substitute for verifying every legacy CSS selector, non-text control or illustration in a rendered browser.

## Practical rules

1. **Do not fill half of the viewport with dark green.** Warm hero, white cards, single small dark supporting section.
2. Use **tomato for action and selected states**, not every border and icon.
3. Use **espresso for the hierarchy**, including default buttons and critical text.
4. Keep **sage confined to illustration surfaces** and verified availability states; don't tint every control green.
5. Let colour signify state: tomato = branded action; green = available; warm amber = preview/error; grayscale = unavailable.
6. Keep focus visible, reduced-motion support intact, and never fake bookings or seat counts.

Design references: the eight submodules documented in `docs/DESIGN_SKILLS.md`, especially Material 3 tonal-surface/semantic colour roles and Emil Kowalski's restrained interaction guidance.
