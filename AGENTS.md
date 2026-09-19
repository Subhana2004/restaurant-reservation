# mesa. — restaurant reservation project

Eight upstream design-skill repositories are version-pinned in `.design-skills/`. Materialize their complete relevant skill directories for Claude Code and other agents:

```bash
python scripts/install_design_skills.py
```

This creates local `.claude/skills/` and `.agents/skills/` copies. The script installs 15 skill folders from eight upstream sources without global config. See `docs/DESIGN_SKILLS.md`.

Design contract: use warm ivory, tomato red and olive with editorial typography, restrained feedback and accessible focus. Build an *actual* reservation journey using the existing API; never fake bookings or seat counts. Handle loading/error/empty states, mobile layout, keyboard escape, and reduced motion. Preserve API contract and all existing tests. The API works with exact UTC date/time slots; the browser stores anonymous reservation confirmation IDs only. Make surgical changes and test.
