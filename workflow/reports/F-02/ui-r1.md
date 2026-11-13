# UI Checker Report — F-02+F-03: Catalogue + Homepage — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 0 Medium, 3 Low)

## What I checked
`/` and `/machines` at 1440, 768 and 375 (screenshots in `screenshots/`: home-/machines- desktop, tablet, mobile, plus `home-desktop-fold.png`, `home-mobile-fold.png`, `home-after-help.png`). Compared with `dev_ref/UI ref/Jtech homepage with red heading accents.png`. No horizontal overflow at any width. "Help me choose" scrolls to and focuses the "What would you like to sew?" H2 (verified). No controls under 44px tall on mobile. Not checked: video playback (headless Chromium has no H.264), the 404 detail links (F-04), keyboard focus ring visuals, loading/error states.
Note: the sticky header shows mid-image in the full-page screenshots; that is a capture artifact. The viewport screenshots show it correctly at the top.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| UI-1 | Low | `/` demo cards, `screenshots/home-desktop.png` | Cards have no unified product-image treatment: the one real photo has a dark studio backdrop while the others show grey "Photo pending" boxes. The cards look uneven, though this is honest and expected until photos exist. | Compare with the UI ref cards (cut-out machines on white). | Accept for now; when photos arrive, use a consistent backdrop or crop. | UI ref |
| UI-2 | Low | `/` at 768, `screenshots/home-tablet.png` | The 2-up card grid leaves Demo model 3 alone on the second row, left-aligned, with an empty right cell. | Layout looks unfinished at tablet width. | Use a 3-up grid at 768 or centre the orphan card. | Handoff "Card layout at 768px" |
| UI-3 | Low | `/` mobile header, `screenshots/home-mobile-fold.png` | The four nav links fill the full width with about 16px gaps and little tap spacing, so the targets are tight. | The logo sits above the nav row. | Add a little more padding between links, or let the row wrap or scroll. | web/CLAUDE.md |

## Fixed since last round
N/A (Round 1)

## Notes for the Builder
- The dark hero (D-017) is coherent and readable, with good contrast, and the red-accent headings match the UI ref. The mask feathering of the image is clean.
- Section order matches the UI ref. The UI ref's "Conceptual images" captions are replaced by honest captions, which is fine.
- `/machines` is consistent with the homepage cards and header/footer. The "Before choosing a machine" panel reads well.
- The "awaiting confirmation" and "not a real offer" labelling is clear, and "Currently unavailable" is visible in red.
