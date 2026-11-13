import Link from "next/link";
import { ProductMedia } from "@/components/ProductMedia";
import { AWAITING, configurationStatus, priceStatus, type Product } from "@/lib/products";

export function ProductCard({ product, headingLevel = 3 }: { product: Product; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="product-card">
      <p className="badge">{product.category ?? "Type awaiting confirmation"}</p>
      <ProductMedia
        image={product.images[0]}
        name={product.name}
        sizes="(max-width: 40rem) 100vw, 33vw"
        caption={false}
      />
      <H className="product-card__name">{product.name}</H>
      <p className="tag">Demo</p>
      <p className="product-card__summary">{product.summary}</p>
      <ul className="product-card__facts">
        <li>Suitability: {product.suitability ?? AWAITING.toLowerCase()}</li>
        <li>{configurationStatus(product)}</li>
        <li>{priceStatus(product)}</li>
        {product.availability === "unavailable" && <li className="product-card__unavailable">Currently unavailable</li>}
      </ul>
      <Link href={`/machines/${product.slug}`} className="link-arrow">
        View machine details<span className="visually-hidden">: {product.name}</span>
      </Link>
    </article>
  );
}

export function ProductGrid({
  items,
  headingLevel,
  compact = false,
}: {
  items: Product[];
  headingLevel?: 2 | 3;
  /** Two-up grid for short lists such as "other machines". */
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "product-grid product-grid--compact" : "product-grid"}>
      {items.map((p) => (
        <li key={p.slug}>
          <ProductCard product={p} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
