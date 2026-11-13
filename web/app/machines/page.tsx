import Link from "next/link";
import { seoFor } from "@/lib/seo";
import { products } from "@/lib/products";
import { ProductGrid } from "@/components/ProductCard";

const PATH = "/machines";

export const metadata = seoFor(PATH);

export default function MachinesPage() {
  return (
    <>
      <section className="container section page-intro">
        <h1>
          Explore Jtech <span className="accent">sewing machine models</span>
        </h1>
        <p className="lede">
          Browse the three sample models in this prototype. Each machine page shows which details, such as
          price and package contents, are confirmed and which are still awaiting confirmation.
        </p>
      </section>

      <section className="container section section--tight" aria-labelledby="before-choosing">
        <div className="guidance">
          <h2 id="before-choosing">Before choosing a machine</h2>
          <p>
            Check the machine details, what is included and the support information before making an
            enquiry.
          </p>
          <ol className="guidance__steps prose-links">
            <li>
              <strong>Think about what you will sew.</strong> Everyday repairs, learning to sew and
              creative projects can need different machines. Describe your plans in your enquiry.
            </li>
            <li>
              <strong>Check what comes with it.</strong> A machine head is the sewing unit on its own.
              A package can add a table, stand, motor or accessories. Only the items listed on a machine
              page are included.
            </li>
            <li>
              <strong>Check support near you.</strong> See the{" "}
              <Link href="/support">support page</Link> and <Link href="/locations">locations</Link>{" "}
              for setup, repair and warranty information.
            </li>
          </ol>
        </div>
      </section>

      <section className="container section" aria-labelledby="range">
        <h2 id="range" className="visually-hidden">
          Demo machine range
        </h2>
        {products.length > 0 ? (
          <ProductGrid items={products} headingLevel={3} />
        ) : (
          <div className="empty-state">
            <h3>No machine information available</h3>
            <p>
              The prototype catalogue is currently unavailable. You can still make a general enquiry
              using the prototype form.
            </p>
            <Link href="/enquiry" className="btn btn--primary">
              Contact Jtech
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
