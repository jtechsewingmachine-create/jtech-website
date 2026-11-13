import NextImage, { type ImageProps } from "next/image";

/**
 * The only image component this project uses.
 *
 * It exists to make the single most expensive mistake impossible: shipping
 * images that depend on JavaScript to resolve. A production site we audited
 * served 82% of its images as a placeholder with the real URL in `data-src`,
 * swapped in by a scroll handler, with no <noscript> fallback — so most AI
 * crawlers, which do not execute JavaScript, saw none of them.
 *
 * `next/image` emits a real `src` and `srcset` with native lazy loading, so
 * that failure mode cannot happen here. The types below additionally force
 * `alt` and explicit dimensions, which removes the layout-shift risk too.
 *
 * `priority` marks the LCP image (usually the hero) so it is preloaded and
 * never lazy-loaded — lazy-loading the hero is a common own goal.
 */
type ImgProps = Omit<ImageProps, "alt" | "loading"> & {
  /** Required. Describe the image's content; "" only for purely decorative. */
  alt: string;
} & ({ width: number; height: number } | { fill: true });

export function Img({ alt, priority, ...props }: ImgProps) {
  return (
    <NextImage
      {...(props as ImageProps)}
      alt={alt}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      decoding="async"
    />
  );
}
