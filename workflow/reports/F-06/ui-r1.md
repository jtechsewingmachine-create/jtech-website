# UI Report — F-06: Support and Locations — Round 1

## Verdict
PASS WITH ISSUES

## What I checked
Screenshots at 1440/768/375 in `workflow/reports/F-06/screenshots/` (support-*.png, locations-*.png; 768 locations viewed only through the shared layout, not opened separately). Compared with `dev_ref/UI ref/Jtech homepage with red heading accents.png` and the blueprint Support and Contact / Locations screens. Not captured: loading state (none exists), error states.

Matches: red accent word in each h1 and "help?", same header/footer, red primary button, bordered cards, grey band, "Awaiting confirmation" italics as on the home page. Blocks match the blueprint (route selector, coverage disclosure, learning links, location route; disclosure, list, empty state). Fictional notice is prominent, each card tagged "Fictional example", no address or distances. No overflow at 375; links and the button are comfortably tappable; labels/visible focus not exhaustively tested beyond QA's checks.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| UI-1 | Low | /support at 768 | Route grid is 3+2, leaving an empty slot and an uneven look. | `screenshots/support-768.png` | Use 2 columns or let the last row stretch at tablet width. | UI ref consistency |
| UI-2 | Low | /locations at 1440 | Large blank gap between the two cards and "Not sure where to go?"; the closing block's small heading is weaker than the other h2s. | `screenshots/locations-1440.png` | Reduce section spacing. | Blueprint Locations |
| UI-3 | Low | /locations | The blueprint lists an optional "Map preview" placeholder; none is present (noted as a known open finding in the handoff). | `screenshots/locations-1440.png` | Acceptable to omit; confirm. | Blueprint Locations, D-004 |
| UI-4 | Low | /support at 1440 | Contact column is short beside the coverage list, leaving blank space under the button. | `screenshots/support-1440.png` | Optional. | none |

## Notes for the Builder
Server on port 3102 was stopped.
