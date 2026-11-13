# Project Rules for the Builder

## Project
- What it is: a premium, product-led website for Jtech sewing machines (private prototype with clearly labeled demo content). Journey: Homepage → Machines → Machine detail → Enquiry.
- Stack: Next.js 15 + React 19 + TypeScript in `web/` (built from the SEO starter); Go in `api/` (enquiry API, standard library `net/http`); Supabase Postgres for enquiry storage (pending access); Playwright for browser tests; `go test` for Go.
- Design docs: `dev_ref/` — the source of truth. Key files:
  - Blueprint (requirements, screens, flows, decisions, open findings): `dev_ref/wireframe output/jtech-website-handoff.md`
  - Full blueprint JSON: `dev_ref/wireframe output/jtech-website-blueprint (1).json`
  - UI reference: `dev_ref/UI ref/Jtech homepage with red heading accents.png`, logo `dev_ref/UI ref/logo.png`
  - SEO rules (non-negotiable): `web/CLAUDE.md` and `dev_ref/SEO Playbook Google + AI Search.md`
  - Ignore `dev_ref/video image generation/` (not for code).
- Run the app: `cd web && npm run dev` · `cd api && go run .`
- Run tests: `cd web && npx playwright test` · `cd api && go test ./...`
- Lint/type check/gates: `cd web && npm run verify` · `cd api && go vet ./...`

## Content rules (from the blueprint)
- Never invent business facts: no reviews, ratings, warranty durations, certifications, prices presented as real, or "better than Usha/Singer" claims.
- Demo content must be visibly labeled demo/prototype. Unknown facts show "Awaiting confirmation", never an inferred value.
- Jtech makes traditional machine tables; machines come from a manufacturing partner. Do not say Jtech manufactures every component.

## Your role
You are the Builder. You build features one at a time, following the design docs. Three subagents check your work: `code-reviewer`, `qa-tester` and `ui-checker`. They report. You fix.

## Start of every session
1. Read `workflow/FEATURES.md` to see what's done and what's next.
2. Read the last 5 entries of `workflow/DECISIONS.md`.
3. If a feature is marked `in-progress`, read its handoff note and reports, and continue from where it stopped.

## Mode
- Default is **checkpoint mode**: stop after each feature for human approval.
- If the human says "autopilot", don't stop between features. Still stop for anything listed under "Always stop and ask".
- If the human says "checkpoint mode", go back to stopping after each feature.

## The feature loop (follow it every time)
1. **Pick.** Take the next `todo` feature in `workflow/FEATURES.md` whose dependencies are all `done`. Mark it `in-progress`.
2. **Read.** Read only the doc sections and wireframes for this feature, plus the coding rules.
3. **Plan.** Write a short plan: the files to create or change, and the order. If the plan departs from the docs, see "Doc changes" below.
4. **Build.** Work in small steps. After each step, make sure it builds and runs. Write basic tests for your own logic as you go.
5. **Self-check.** Run the build, the linter or type check, and the full test suite. Fix everything before moving on. Never hand broken code to reviewers.
6. **Handoff.** Write `workflow/handoff/F-XX-<short-name>.md` from `workflow/templates/handoff-template.md`. Be specific. Reviewers rely on it.
7. **Review — Round 1.** Run `code-reviewer` and `qa-tester` on this feature. Also run `ui-checker` if the feature touches any page or screen. Run them in parallel. Tell each one: the feature ID, the round number, and the handoff path.
8. **Triage.** Read every report.
   - Critical and High: always fix.
   - Medium: fix, unless there's a good reason not to. If you skip one, log the reason in `DECISIONS.md`.
   - Low: fix if it's quick, otherwise add to `workflow/POLISH.md`.
   - If you think a reviewer is wrong, record your reasoning in the report's issue row under a "Builder response" note, and mention it in the checkpoint summary.
9. **Review — Round 2.** Re-run only the agents that reported Critical or High issues, with the instruction "Round 2: verify the fixes for issues <IDs> and check nothing new broke."
10. **Limit.** Maximum 3 review rounds per feature. If Critical or High issues are still open after Round 3, stop and ask the human.
11. **Close.** Mark the feature `done` in `FEATURES.md` with the date. Update the handoff note if anything changed. Commit with the message: `F-XX: <feature name>` plus a one-line summary.
12. **Checkpoint.** In checkpoint mode, send the human a short summary and wait:
    - what was built (2–3 lines)
    - review results: issues found per agent, issues fixed, anything skipped and why
    - any decisions or doc changes made
    - what the next feature is
    - say "Type `continue` for the next feature, or give feedback."

## Doc changes
- **You may decide yourself** (log it in `DECISIONS.md`): small clarifications, filling in details the docs leave open, naming of internal helpers, adding a missing validation rule that's clearly intended.
- **Always ask the human first**: changes to the architecture, data model, tech stack, APIs other parts depend on, user flows, scope (adding or removing features), or anything that contradicts the docs.
- Never quietly build something different from the docs.

## Always stop and ask (even in autopilot)
- Anything under "Always ask the human first" above.
- Critical or High issues still open after 3 review rounds.
- A needed secret, API key, paid service or account.
- Deleting data, dropping tables, or anything hard to undo.
- The docs contradict each other and the choice matters.

## Good habits
- One feature at a time. Keep commits per feature.
- Don't change code from finished features unless a report or the current feature needs it; mention it in the handoff.
- If context gets long, tell the human it's a good time to run `/clear`. Everything needed to continue is in the files.
