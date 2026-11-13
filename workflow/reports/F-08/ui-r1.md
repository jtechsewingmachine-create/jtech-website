# UI report F-08, Round 1

Verdict: **PASS with notes**. Counts: Critical 0, High 0, Medium 0, Low 3.
Screenshots (chromium and webkit, 1440 and 375, `/`, `/enquiry`, `/machines/demo-model-2`): `workflow/reports/F-08/screenshots/{home,enquiry,demo2}-{chromium,webkit}-{1440,375}.png`. Tablet 768 not taken (the task specified 1440 and 375). Server on :3102 stopped.

## Engines
Chromium and WebKit renders are visually identical at both widths. The hero image shows in WebKit (the mask-composite fix works), selects in WebKit are 48px with a chevron (`enquiry-webkit-1440.png`), no overflow at 375 (`home-webkit-375.png`, `demo2-webkit-375.png`).

## Versus reference (`dev_ref/UI ref/Jtech homepage with red heading accents.png`)
Structure, order, red heading accents, dark video band and footer all match. Known deviation: hero is dark (studio image) where the reference is light grey; consistent with the generated image and across pages, not a defect.

## Assets
- `web/public/og.png`: clean 1200x630, logo, headline with red accent, product image, readable. Good. Says "Jtech" brand and no claims.
- `web/app/apple-icon.png`: red "J" with a **black** dot on white, 180px; plain and the dot colour differs from the logo's red dot (L-1).

## Issues
- L-1 (Low): apple-icon dot is black, logo dot is dark/red-adjacent; consider matching the logo. `web/app/apple-icon.png`.
- L-2 (Low): two of three home cards show "Photo pending" placeholders (`home-chromium-1440.png`); intentional per honesty rules, but looks unfinished.
- L-3 (Low): focus ring on dark header/footer is 2.85:1 (see QA M-1); not visible in static screenshots.
No wireframe for `/enquiry`; judged against closest UI example and site pages: consistent labels, clear required markers, strong primary button.
