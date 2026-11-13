import Link from "next/link";
import { notFound } from "next/navigation";
import { seoFor, breadcrumbJsonLd } from "@/lib/seo";
import {
  AWAITING,
  formatSamplePrice,
  productBySlug,
  products,
  type Product,
} from "@/lib/products";
import { ProductMedia } from "@/components/ProductMedia";
import { ProductGrid } from "@/components/ProductCard";

type Props = { params: Promise<{ slug: string }> };

const pathFor = (slug: string) => `/machines/${slug}`;

// Only the registered demo models exist; any other slug is a real 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  return seoFor(pathFor((await params).slug));
}

export default async function MachinePage({ params }: Props) {
  const product = productBySlug((await params).slug);
  if (!product) notFound();

  const unavailable = product.availability === "unavailable";
  const enquiry = `/enquiry?model=${product.slug}`;
  const others = products.filter((p) => p.slug !== product.slug);
  const [lead, ...rest] = product.images;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(pathFor(product.slug))) }}
      />

      <div className="container">
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/machines">Machines</Link>
            </li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>
      </div>

      <section className="container detail-top" aria-labelledby="machine-title">
        <div className="detail-top__media">
          <ProductMedia image={lead} name={product.name} sizes="(max-width: 48rem) 100vw, 55vw" priority />
        </div>

        <div className="detail-top__summary">
          <p className="detail-top__tags">
            <span className="badge">{product.category ?? "Type awaiting confirmation"}</span>{" "}
            <span className="tag">Demo</span>
          </p>
          <h1 id="machine-title">
            Jtech <span className="accent">{product.name}</span>
          </h1>
          <p className="lede">{product.summary}</p>

          {unavailable && (
            <p className="notice notice--warn" role="note">
              <strong>Currently unavailable.</strong> You can still ask about availability or explore
              other machines.
            </p>
          )}

          <h2 className="h-small" id="contents">
            What comes with the machine?
          </h2>
          <Configurations product={product} />

          <div className="detail-top__actions">
            <Link href={enquiry} className="btn btn--primary">
              {unavailable ? "Ask about availability" : "Ask about this machine"}
            </Link>
            <Link href="/machines" className="link-arrow">
              Explore all machines
            </Link>
          </div>
          <p className="small">
            Asking about a machine opens a short form with this machine already selected. It is not an
            order and no payment is taken.
          </p>
        </div>
      </section>

      {rest.length > 0 && (
        <section className="container section" aria-labelledby="closer-look">
          <h2 id="closer-look">
            A closer <span className="accent">look</span>
          </h2>
          <ul className="gallery">
            {rest.map((img) => (
              <li key={img.src}>
                <ProductMedia image={img} name={product.name} sizes="(max-width: 40rem) 100vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="band band--light" aria-labelledby="suitability">
        <div className="container detail-cols">
          <div>
            <h2 id="suitability">
              Is it right for your <span className="accent">sewing?</span>
            </h2>
            <dl className="facts">
              <Fact label="Suited to" value={product.suitability} />
              <Fact label="Limitations" value={product.limitations} />
              <Fact label="Setup needs" value={product.setup} />
            </dl>
            <p>
              Not sure? Describe what you would like to sew in your enquiry and the Jtech team can help.
            </p>
          </div>
          <div>
            <h2 id="specifications">Machine specifications</h2>
            <dl className="facts">
              {product.specs.map((s) => (
                <Fact key={s.label} label={s.label} value={s.value} />
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="support">
        <h2 id="support">
          Support and <span className="accent">learning</span>
        </h2>
        <div className="detail-cols">
          <div>
            <h3>Support and service</h3>
            <p>
              Warranty terms, setup assistance, repair arrangements and service coverage for the{" "}
              {product.name} are awaiting confirmation.
            </p>
            <div className="link-row">
              <Link href="/support" className="link-arrow">
                View support options
              </Link>
              <Link href="/locations" className="link-arrow">
                View locations
              </Link>
            </div>
          </div>
          <div>
            <h3>Learning to use your machine</h3>
            <p>
              Demonstrations, setup guides and tutorials for the {product.name} are not yet available.
              You can include a usage question in your enquiry.
            </p>
            <div className="link-row">
              <Link href={`${enquiry}&intent=product`} className="link-arrow">
                Ask a product question
              </Link>
            </div>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="container section" aria-labelledby="others">
          <h2 id="others">
            Other machines to <span className="accent">consider</span>
          </h2>
          <p className="lede">
            Model differences and suitability are awaiting confirmation, so these are not recommendations.
          </p>
          <ProductGrid items={others} compact />
        </section>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={value ? undefined : "pending"}>{value ?? AWAITING}</dd>
    </div>
  );
}

function Configurations({ product }: { product: Product }) {
  if (product.configurations.length === 0) {
    return (
      <p className="pending">
        Package contents and price are awaiting confirmation. Do not assume a table, stand, motor, case
        or accessories are included.
      </p>
    );
  }
  return (
    <ul className="configs">
      {product.configurations.map((c) => (
        <li key={c.id}>
          <p className="configs__label">
            {c.label}{" "}
            <span className="tag">{c.kind === "head-only" ? "Head only" : "Package"}</span>
          </p>
          <p className="configs__includes">
            Includes: {c.includes ? c.includes.join(", ") : AWAITING.toLowerCase()}
          </p>
          <p className="configs__price">{formatSamplePrice(c.samplePrice)}</p>
        </li>
      ))}
    </ul>
  );
}
