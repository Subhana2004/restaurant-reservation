"""Project-scoped installer for the eight pinned design-skill repositories."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".design-skills"
DESTINATIONS = [ROOT / ".claude" / "skills", ROOT / ".agents" / "skills"]
SKILLS = [
    ("emil-kowalski", "skills/emil-design-eng", "emil-design-eng"),
    ("emil-kowalski", "skills/animate", "emil-animate"),
    ("emil-kowalski", "skills/mobile-native", "emil-mobile-native"),
    ("emil-kowalski", "skills/review-animations", "emil-review-animations"),
    ("emil-kowalski", "skills/animation-vocabulary", "emil-animation-vocabulary"),
    ("emil-kowalski", "skills/improve-animations", "emil-improve-animations"),
    ("anthropic-skills", "skills/frontend-design", "frontend-design"),
    ("anthropic-skills", "skills/webapp-testing", "webapp-testing"),
    ("anthropic-skills", "skills/web-artifacts-builder", "web-artifacts-builder"),
    ("ui-ux-pro-max", ".claude/skills/ui-ux-pro-max", "ui-ux-pro-max"),
    ("material-3", "skills/material-3", "material-3"),
    ("karpathy-guidelines", "skills/karpathy-guidelines", "karpathy-guidelines"),
    ("animate-delphi", ".", "delphi-animate"),
    ("design-motion", "skills/design-motion-principles", "design-motion-principles"),
    ("design-engineering", "skills/design-engineering", "design-engineering"),
]
def main():
    subprocess.run(["git", "submodule", "update", "--init", "--recursive"], cwd=ROOT, check=True)
    for parent, relative, alias in SKILLS:
        source = SRC / parent / relative
        if not (source / "SKILL.md").is_file():
            raise FileNotFoundError(f"Missing {source / 'SKILL.md'}")
        for dest_root in DESTINATIONS:
            dest_root.mkdir(parents=True, exist_ok=True)
            dest = dest_root / alias
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(source, dest, ignore=shutil.ignore_patterns(".git", "__pycache__", "*.pyc"))
            print(f"Installed {alias} to {dest.relative_to(ROOT)}")
    print("Complete: all eight source repositories installed for this project.")
if __name__ == "__main__":
    try:
        main()
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"Could not finish installation: {exc}", file=sys.stderr)
        sys.exit(1)
