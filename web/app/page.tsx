import Link from "next/link";
import { seoFor } from "@/lib/seo";
import { products } from "@/lib/products";
import { Img } from "@/components/Img";
import { ProductGrid } from "@/components/ProductCard";
import { FocusOnHash } from "@/components/FocusOnHash";
import { DemoVideo } from "@/components/DemoVideo";

const PATH = "/";

export const metadata = seoFor(PATH);

const interests = [
  "Everyday repairs and alterations",
  "Learning to sew",
  "Creative sewing projects",
];

const pending = ["Product details", "Package contents", "Support information"];

export default function Home() {
  const hero = products[0]?.images[0];

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="hero__kicker">Private prototype: sample products and details.</p>
            <h1 id="hero-title">
              Find your next Jtech <span className="accent">sewing machine</span>
            </h1>
            <p className="hero__lede">
              Explore machines, understand what&apos;s included, and find out what to consider before
              choosing.
            </p>
            <p className="hero__note">Demo model · Configuration and price awaiting confirmation</p>
            <div className="hero__actions">
              <Link href="/machines" className="btn btn--primary">
                Explore machines
              </Link>
              <Link href="/#choosing-help" className="btn btn--ghost">
                Help me choose
              </Link>
            </div>
          </div>
          {hero && (
            <figure className="hero__media">
              <Img
                src={hero.src}
                alt={hero.alt}
                width={hero.width}
                height={hero.height}
                sizes="(max-width: 48rem) 100vw, 60vw"
                priority
              />
              <figcaption>Generated studio image of the sample unit</figcaption>
            </figure>
          )}
        </div>
      </section>

      <section className="container section" aria-labelledby="choosing-help">
        <FocusOnHash id="choosing-help" />
        <h2 id="choosing-help" tabIndex={-1}>
          What would you like to <span className="accent">sew?</span>
        </h2>
        <p className="lede">Start with the projects you have in mind.</p>
        <ol className="interests">
          {interests.map((label, i) => (
            <li key={label}>
              <span className="interests__num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <div className="rule-row">
          <p className="small">Illustrative interests; model suitability is not yet verified.</p>
          <Link href="/machines" className="link-arrow">
            Explore all machines
          </Link>
        </div>
      </section>

      <section className="container section" aria-labelledby="demo-range">
        <h2 id="demo-range">
          Explore the <span className="accent">demo range</span>
        </h2>
        <p className="lede">Three sample models for exploring the catalogue.</p>
        {products.length > 0 ? (
          <ProductGrid items={products} />
        ) : (
          <div className="empty-state">
            <h3>Machine information is not available</h3>
            <p>No demo machine summaries are available. Support is still available while catalogue information is prepared.</p>
            <Link href="/support" className="btn btn--primary">
              View support information
            </Link>
          </div>
        )}
      </section>

      <section className="band band--dark" aria-labelledby="in-action">
        <div className="container band__inner">
          <div>
            <h2 id="in-action">
              See the details <span className="accent">in action</span>
            </h2>
            <p>
              A short clip of a sewing-machine needle hemming denim, used here to preview how product
              demonstrations will appear.
            </p>
            <p className="band__muted">
              Generated video for layout preview. It is not a recorded demonstration and does not show
              how any Jtech machine performs.
            </p>
            {products[0] && (
              <Link href={`/machines/${products[0].slug}`} className="link-arrow">
                See product details
              </Link>
            )}
          </div>
          <figure className="video">
            <DemoVideo
              src="/media/hemming-demo.mp4"
              poster="/images/hemming-demo-poster.jpg"
              describedBy="in-action-desc"
            />
            <figcaption id="in-action-desc">
              Text description: a presser foot guides the folded hem of blue denim while the needle
              stitches along the edge. No sound.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="band band--light" aria-labelledby="choosing">
        <div className="container">
          <h2 id="choosing">
            Know what you&apos;re <span className="accent">choosing</span>
          </h2>
          <p className="lede">
            Product details, package contents and support information are awaiting confirmation.
          </p>
          <ul className="pending-grid">
            {pending.map((label) => (
              <li key={label}>
                <strong>{label}</strong>
                <span>awaiting confirmation</span>
              </li>
            ))}
          </ul>
          <Link href="/support" className="link-arrow">
            View support information
          </Link>
        </div>
      </section>

      <section className="container locations-strip" aria-label="Locations">
        <Link href="/locations" className="locations-strip__link link-arrow">
          View locations
        </Link>
        <p className="small">Clearly fictional prototype locations.</p>
      </section>
    </>
  );
}
