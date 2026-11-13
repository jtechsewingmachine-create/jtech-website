# UI Checker Report — F-04 + F-05: Machine detail, Enquiry, Confirmation — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 2 Medium, 3 Low)

## What I checked
Pages /machines/stylish-stitcher, demo-model-2, demo-model-3, /enquiry (plain, ?model=demo-model-2, ?intent=trade, hostile ?model=<script>&intent=zzz), /enquiry/confirmation (direct, and after real submit) at 1440/768/375. States: empty-submit error (focus lands on error summary, per-field text errors), submitting, offline failure (values kept, Retry + Contact support), success, missing-context. No horizontal overflow at any width. Compared with the homepage UI ref (red heading accents, footer, buttons) and blueprint screens. Screenshots in workflow/reports/F-04/screenshots/ (e.g. m2-1440.png, stitcher-375.png, m3-768.png, enq-error-1440.png, enq-failure-375.png, conf-success-1440.png, conf-missing-1440.png).
Not checked: keyboard tab order and focus-ring visuals by hand, contrast measurement, pincode/acknowledgement fields (handoff does not include them; blueprint lists them as fields).

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| UI-1 | Medium | /enquiry/confirmation (missing state) | Missing-context state still shows the success heading "Simulation complete" plus the paragraph above the "No confirmation details are available." box. A visitor who lands here directly is told a simulation completed. Also two "Continue browsing" / "Browse machines" links duplicate each other. | conf-missing-1440.png vs conf-success-1440.png | Render heading/intro only in the success state; in the missing state use a neutral heading (e.g. "Enquiry confirmation") and drop the duplicate link. | Blueprint Enquiry Confirmation: success_summary and empty are separate states |
| UI-2 | Medium | /enquiry form | Blueprint form has optional pincode and a required acknowledgement checkbox; neither is present. Handoff does not state the deliberate omission. | enq-error-1440.png | Confirm decision (D-0xx) or add; at least note it in the handoff. | Blueprint Product and Contact Enquiry fields |
| UI-3 | Low | Detail pages (stitcher/m2/m3), gallery | Models 2 and 3 show a single grey "Photo pending" box and leave an empty column below it on desktop; "Other machines" grid has two cards left-aligned with an empty third column. Looks unbalanced but is honest placeholder content. | m2-1440.png | Centre or stretch the two-card row; optionally make placeholder sticky/shorter. | UI ref homepage 3-card row |
| UI-4 | Low | Detail page mobile | On mobile the hero image sits above the h1 and the title block, so the primary "Ask about this machine" button is about one screen down; acceptable but the full-width placeholder on m3 is very tall. | m3-768.png, stitcher-375.png | Cap placeholder aspect ratio on mobile. | - |
| UI-5 | Low | Enquiry page mobile | "About your enquiry" card appears above the prototype notice, so the Retry/Contact support block pushes the form down; stacked Retry and Contact support buttons are not equal width. | enq-failure-375.png | Make the two buttons the same width on mobile. | - |

## Fixed since last round (Round 2+ only)
n/a

## Notes for the Builder
- Style matches the UI ref well: red heading accents, black pill badges, red primary buttons, dark footer, grey section band.
- Form states are clear: error summary focused, text errors ("Error: ..."), "Sending…" state, failure keeps values. Hostile query params rendered safely with default form (no script text echoed).
- Disabled/unavailable (m3) note and "Ask about availability" label are good.

## Builder response
- UI-1: fixed — confirmation h1 is neutral ("Your Jtech enquiry"); success panel or missing-context panel below; no duplicate links.
- UI-2: not changed — pincode and acknowledgement checkbox were removed on purpose per the blueprint's own open review findings (D-004). Handoff updated to say so.
- UI-3: "Other machines" uses a 2-up compact grid. UI-4: detail-page photo placeholder is 16:9. UI-5 → POLISH.md.
