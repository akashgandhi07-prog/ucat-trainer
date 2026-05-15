# Unify plan bullet 1 (Git): integration branch hygiene

Supports **checklist item 1** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**: all work that should ship in the **`skills-plan-unify` → `main`** cutover is **reachable on the integration branch** you merge—not only on laptops or fork branches.

## Intended remote

Canonical upstream: **TheUKCATPeople/skills-trainer**, integration branch **`skills-plan-unify`** (see playbook). Local clones may use a fork or different `origin`; adjust commands accordingly.

## Bootstrap `skills-plan-unify` locally (first time)

If the branch does not exist on your remote yet, from an up-to-date **`main`**:

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b skills-plan-unify
git push -u origin skills-plan-unify
```

Then open PRs **into** **`skills-plan-unify`** until cutover (see playbook).

## Quick audit (run locally before opening the cutover PR)

The audit also prints **`upstream`** (if configured), runs **`git fetch upstream --prune`** when **`upstream`** exists, and reports whether **`refs/remotes/origin/skills-plan-unify`** / **`refs/remotes/upstream/skills-plan-unify`** exist.

```bash
npm run unify:bullet1-audit
git remote -v
git fetch origin
git branch -a
git checkout skills-plan-unify   # or your integration branch name
git merge-base --is-ancestor YOUR_FEATURE_BRANCH HEAD && echo "feature is merged" || echo "feature NOT merged"
```

Repeat `merge-base --is-ancestor` for every branch that must ship. If any prints **NOT merged**, merge or cherry-pick into **`skills-plan-unify`** first.

## PR discipline

- Open PRs **into** `skills-plan-unify` (not only into `main`) until cutover is approved.
- After a large merge, run **`npm run unify:bullet2-verify-ci`** (see **`docs/UNIFY_BULLET8_CI_PARITY.md`**) before pushing.

## Fork workflow

If `origin` is your fork:

```bash
git remote add upstream https://github.com/TheUKCATPeople/skills-trainer.git
git fetch upstream
git checkout skills-plan-unify
git merge upstream/skills-plan-unify
# resolve conflicts, run verify, push to your fork, open PR to upstream skills-plan-unify
```

## Related

- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md)
- [`UNIFY_RELEASE_GATE_STATUS.md`](UNIFY_RELEASE_GATE_STATUS.md)
- [`UNIFY_BULLET8_CI_PARITY.md`](UNIFY_BULLET8_CI_PARITY.md)
