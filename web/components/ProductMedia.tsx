import { Img } from "@/components/Img";
import { imageCaption, type ProductImage } from "@/lib/products";

/**
 * A product image with its source caption, or a labelled "photo pending" block
 * when no image has been supplied (blueprint missing_media state).
 */
export function ProductMedia({
  image,
  name,
  sizes,
  priority = false,
  caption = true,
}: {
  image: ProductImage | undefined;
  name: string;
  sizes: string;
  priority?: boolean;
  caption?: boolean;
}) {
  if (!image) {
    return (
      <figure className="media media--pending">
        <div className="media__pending" role="img" aria-label={`Photo of ${name} pending`}>
          <span>Photo pending</span>
        </div>
      </figure>
    );
  }
  return (
    <figure className="media">
      <Img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
      />
      {caption && <figcaption>{imageCaption[image.source]}</figcaption>}
    </figure>
  );
}
