/**
 * Inline copy of public/logo.svg so the tagline can follow the surrounding text
 * colour (black on the header, white on the dark footer). Keep both in sync.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1790 890"
      role="img"
      aria-label="Jtech Sewing Machines"
      width={179}
      height={89}
    >
      <g transform="translate(-110 -300)">
        <g fill="var(--logo-red)">
          <path d="M165 318H289V960C287 1062 232 1140 125 1176C186 1120 207 1060 207 990V354H165Z" />
          <path d="M455 345H540V487L712 466C640 492 572 522 540 562V845H645V925H562C497 925 455 893 455 830Z" />
          <path d="M1405 318H1537V920H1467V356H1405Z" />
          <path d="M1735 895H1875V935H1735Z" />
        </g>
        <g fill="none" stroke="var(--logo-red)" strokeWidth="78">
          <path d="M748 768L946 650A128 146 0 1 0 956 822" />
          <path d="M1328 650A132 148 0 1 0 1336 838" />
          <path d="M1500 640C1540 585 1600 575 1660 575C1740 575 1776 622 1776 700V915" />
        </g>
        <circle cx="366" cy="683" r="26" fill="currentColor" />
        <text
          x="610"
          y="1085"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="128"
          textLength="1245"
          lengthAdjust="spacingAndGlyphs"
          fill="currentColor"
        >
          Sewing Machines
        </text>
      </g>
    </svg>
  );
}
