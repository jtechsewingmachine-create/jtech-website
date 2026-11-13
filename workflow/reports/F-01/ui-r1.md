# UI Checker Report — F-01: Site shell — Round 1

## Verdict
PASS WITH ISSUES (0 Critical, 0 High, 1 Medium, 3 Low)

## What I checked
- Header, footer, skip link and 404 page at 1440, 768 and 375 (plus 320 for overflow) against `dev_ref/UI ref/Jtech homepage with red heading accents.png` and the nav in `dev_ref/wireframe output/jtech-website-handoff.md`. Production build served on port 3102 (since stopped).
- Screenshots in `workflow/reports/F-01/screenshots/`: `home-{1440,768,375}.png`, `home-full-{1440,375}.png`, `nf-{1440,768,375}.png`, `skip-{1440,375}.png`, `focus-*.png`.
- Measured in the DOM: no horizontal scroll at 320, 375, 768 or 1440. Every header and footer link is at least 44px tall. The header is `position: sticky` with `scroll-padding-top` of 112px. First Tab shows "Skip to content" with a 3px red outline, and Enter moves focus to `main#main`. Page titles and `lang=en` are set.
- Not checked: homepage body (placeholder, F-03), the destination pages `/machines`, `/support`, `/locations` and `/enquiry` (404 for now, as expected), and states beyond the 404 page (none apply to the shell).

## Matches the reference
- Header: logo top-left and four links (Machines, Choosing Help, Support, Locations) top-right, white with a hairline border.
- Footer: dark background, logo in the left column, Explore / Help / Business groups with dividers, copyright left, prototype notice right.
- Footer link text matches the ref: Explore has Machines and Choosing Help, Help has Support, Locations and Contact, Business has Trade Enquiry.
- The footer logo is brighter red on dark, readable.
- The 404 page uses the same shell, has a clear heading and a "Back to the home page" arrow link, so there is no dead end.

## Issues
| ID | Severity | Location | Problem | Evidence / repro steps | Suggested fix | Doc reference |
|----|----------|----------|---------|------------------------|---------------|---------------|
| UI-1 | Medium | Header at <=375px (`screenshots/home-375.png`) | The header wraps to two rows and is about 137px tall (logo row plus nav row). It is sticky, so it covers about 20% of a 700px phone viewport on every page. | Measured 137px at 320 and 375, versus 100px at 1440. The ref shows a single compact row. | Shrink the logo on mobile (about 48px high) or make only the nav row non-sticky, so the sticky bar is about 90px or less. Check that `scroll-padding-top` still matches. | UI ref header |
| UI-2 | Low | Header logo vs footer logo | The header logo red is darker and more maroon (about #9c1020) than the ref and the footer logo (brighter red, about #c8161d). | Compare `home-full-1440.png` header and footer. The ref header logo is a bright red close to the footer one. | Use the same `--logo-red` in the header as the brand red, unless the darker red is deliberate. | UI ref header |
| UI-3 | Low | Footer on short pages (`nf-1440.png`, `nf-768.png`) | The footer does not sit at the bottom of the viewport. A white band shows below it (about 60px at 1440x900, 130px at 768x1024). | Open `/does-not-exist` at 1440x900. The footer ends at about 838px and white fills the rest. | Make the body `min-height: 100vh` as a flex column with `main { flex: 1 }`. | General polish |
| UI-4 | Low | Header nav at 320px | "Locations" ends 3px from the screen edge (right edge 317 of 320). It fits with no overflow, but there is no gutter. | DOM measurement at 320. 375 is fine (16px gutter). | Reduce the nav gap or font size at <=340px, or allow horizontal scroll. Very low priority. | n/a |

## Notes for the Builder
- Accessibility basics pass: the skip link is visible and styled, there is a clear focus ring, 44px targets, and nav links are real anchors.
- Sticky header plus anchor offset (112px) is set. I could not test `/#choosing-help` because that section does not exist yet (F-03).
- Footer logo contrast on dark is good.
- At 1440 the header and footer content is centred in a roughly 1120px container, which is slightly narrower than the ref's edge padding. That is acceptable.
