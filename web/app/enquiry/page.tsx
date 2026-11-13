import Link from "next/link";
import { seoFor } from "@/lib/seo";
import { products, productBySlug } from "@/lib/products";
import { isIntent } from "@/lib/enquiry";
import { EnquiryForm } from "@/components/EnquiryForm";

const PATH = "/enquiry";

export const metadata = seoFor(PATH);

type Props = { searchParams: Promise<{ model?: string | string[]; intent?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function EnquiryPage({ searchParams }: Props) {
  const q = await searchParams;
  // Untrusted query values: keep only known slugs and intents.
  const product = productBySlug(first(q.model));
  const rawIntent = first(q.intent);
  const intent = isIntent(rawIntent) ? rawIntent : product ? "product" : "";

  return (
    <section className="container section enquiry">
      <div className="enquiry__intro">
        <h1>
          Contact <span className="accent">Jtech</span>
        </h1>
        <p className="lede">Ask about machines, trade enquiries or support.</p>
        <div className="enquiry__summary">
          <h2 className="h-small">About your enquiry</h2>
          {product ? (
            <p>
              You are asking about the <strong>{product.name}</strong> (demo listing). You can change the
              machine in the form, or <Link href="/machines">browse all machines</Link>.
            </p>
          ) : (
            <p>
              You can ask a general or trade question without choosing a machine. To ask about a specific
              machine, choose it in the form or <Link href="/machines">browse machines</Link>.
            </p>
          )}
          <p className="small">
            Asking is not an order and no payment is taken. Response times are not yet confirmed.
          </p>
        </div>
      </div>
      <EnquiryForm
        models={products.map((p) => ({ slug: p.slug, name: p.name }))}
        initial={{ intent, model: product?.slug ?? "" }}
      />
    </section>
  );
}
