/**
 * The demo catalogue. One source for listing cards, detail pages and the enquiry form.
 *
 * Rules (blueprint, "Do not invent business facts"):
 * - `null` means unknown and renders as "Awaiting confirmation". Never fill a gap with a guess.
 * - Only state what is visible on the sample unit or supplied by the owner.
 * - Sample prices are mock values for layout testing and are always labelled as such.
 */

export type ImageSource = "photo" | "generated";

export interface ProductImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Shown as a caption, so visitors know what kind of image they are looking at. */
  source: ImageSource;
}

export interface Configuration {
  id: string;
  label: string;
  /** "head-only" = the sewing unit alone; "package" = head plus listed items. */
  kind: "head-only" | "package";
  /** Listed contents; null = awaiting confirmation. Never inferred from photos.
   *  For demo products these are sample values, and the label says so. */
  includes: string[] | null;
  /** Mock price in INR for layout testing only; null = awaiting confirmation. */
  samplePrice: number | null;
}

export interface Spec {
  label: string;
  value: string | null;
}

export interface Product {
  slug: string;
  name: string;
  /** null = type awaiting confirmation. */
  category: string | null;
  /** Every product is demo content until the owner verifies it. */
  isDemo: true;
  summary: string;
  suitability: string | null;
  limitations: string | null;
  setup: string | null;
  configurations: Configuration[];
  images: ProductImage[];
  specs: Spec[];
  /** null = awaiting confirmation. */
  availability: "available" | "unavailable" | null;
}

export const AWAITING = "Awaiting confirmation";

export const imageCaption: Record<ImageSource, string> = {
  photo: "Photo of a sample unit",
  generated: "Generated studio image of the sample unit",
};

export const products: Product[] = [
  {
    slug: "stylish-stitcher",
    name: "Stylish Stitcher",
    category: null,
    isDemo: true,
    summary:
      "A Jtech machine shown with photos of a sample unit. Machine type, suitability and package contents are awaiting confirmation.",
    suitability: null,
    limitations: null,
    setup: null,
    configurations: [],
    images: [
      {
        src: "/images/stylish-stitcher-studio.jpg",
        width: 1800,
        height: 1316,
        alt: "White Jtech Stylish Stitcher sewing machine with selector and stitch length dials, on a dark background",
        source: "generated",
      },
      {
        src: "/images/sample-front.jpg",
        width: 1600,
        height: 720,
        alt: "Front of the Jtech Stylish Stitcher sample unit on a workshop floor",
        source: "photo",
      },
      {
        src: "/images/sample-dials.jpg",
        width: 1280,
        height: 576,
        alt: "Close-up of the selector dial and stitch length dial",
        source: "photo",
      },
      {
        src: "/images/sample-needle-plate.jpg",
        width: 1280,
        height: 576,
        alt: "Close-up of the presser foot and needle plate",
        source: "photo",
      },
      {
        src: "/images/sample-logo-panel.jpg",
        width: 1280,
        height: 576,
        alt: "Jtech logo on the front panel of the machine",
        source: "photo",
      },
      {
        src: "/images/sample-side.jpg",
        width: 1600,
        height: 720,
        alt: "Side panel of the sample unit",
        source: "photo",
      },
    ],
    specs: [
      { label: "Machine type", value: null },
      { label: "Controls", value: "Selector dial and stitch length dial, as marked on the sample unit" },
      { label: "Stitch patterns", value: null },
      { label: "Motor and power", value: null },
      { label: "Weight", value: null },
      { label: "Warranty", value: null },
    ],
    availability: null,
  },
  {
    slug: "demo-model-2",
    name: "Demo model 2",
    category: "Traditional with table",
    isDemo: true,
    summary:
      "Sample listing for a traditional machine, shown with two sample package options to explain head-only and table packages.",
    suitability: null,
    limitations: null,
    setup: null,
    configurations: [
      {
        id: "head",
        label: "Sample option: machine head only",
        kind: "head-only",
        includes: ["Machine head"],
        samplePrice: 6500,
      },
      {
        id: "table-package",
        label: "Sample option: machine with Jtech table and stand",
        kind: "package",
        includes: ["Machine head", "Jtech sewing-machine table", "Stand"],
        samplePrice: 11500,
      },
    ],
    images: [],
    specs: [
      { label: "Machine type", value: null },
      { label: "Drive", value: null },
      { label: "Table size", value: null },
      { label: "Warranty", value: null },
    ],
    availability: "available",
  },
  {
    slug: "demo-model-3",
    name: "Demo model 3",
    category: "Traditional with table",
    isDemo: true,
    summary:
      "Sample listing for a traditional machine with a table. Package contents are awaiting confirmation.",
    suitability: null,
    limitations: null,
    setup: null,
    configurations: [],
    images: [],
    specs: [
      { label: "Machine type", value: null },
      { label: "Drive", value: null },
      { label: "Table size", value: null },
      { label: "Warranty", value: null },
    ],
    availability: "unavailable",
  },
];

export const productBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** One-line price status for cards: never shows a mock price without saying so. */
export function priceStatus(p: Product): string {
  const prices = p.configurations
    .map((c) => c.samplePrice)
    .filter((n): n is number => n !== null);
  if (prices.length === 0) return `Price: ${AWAITING.toLowerCase()}`;
  return `Sample price from ${inr.format(Math.min(...prices))} (not a real offer)`;
}

export const formatSamplePrice = (n: number | null): string =>
  n === null ? AWAITING : `${inr.format(n)} sample price (not a real offer)`;

/** One-line configuration status for cards. */
export function configurationStatus(p: Product): string {
  if (p.configurations.length === 0) return `Configuration: ${AWAITING.toLowerCase()}`;
  return `Options: ${p.configurations.map((c) => c.label).join(" · ")}`;
}
