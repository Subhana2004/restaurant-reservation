# Design skills used by mesa.

This repository tracks the **eight original GitHub repositories as Git submodules**, pinned to specific commits; no unlicensed source files are republished directly.

| Source | Project directory |
| --- | --- |
| https://github.com/emilkowalski/skills | `.design-skills/emil-kowalski` |
| https://github.com/anthropics/skills | `.design-skills/anthropic-skills` |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `.design-skills/ui-ux-pro-max` |
| https://github.com/hamen/material-3-skill | `.design-skills/material-3` |
| https://github.com/multica-ai/andrej-karpathy-skills | `.design-skills/karpathy-guidelines` |
| https://github.com/delphi-ai/animate-skill | `.design-skills/animate-delphi` |
| https://github.com/kylezantos/design-motion-principles | `.design-skills/design-motion` |
| https://github.com/AgentsORG/design-engineering | `.design-skills/design-engineering` |

To install all eight in a local checkout:

```bash
git clone --recurse-submodules https://github.com/Subhana2004/restaurant-reservation.git
cd restaurant-reservation
python scripts/install_design_skills.py
```

If you already cloned: `git pull && python scripts/install_design_skills.py`. Git and an internet connection are required to fetch submodules. The installer creates 15 focused skill directories in *both* `.claude/skills` (Claude Code) and `.agents/skills` (other agents), with their original references/scripts preserved. The two separate upstream Animate skills have distinct local names. Re-run the installer after updating a submodule. Skill content remains locally generated and gitignored; see each upstream repository for license and attribution. This does not install anything into your ChatGPT account.
