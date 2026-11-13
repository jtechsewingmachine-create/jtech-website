import Link from "next/link";
import { seoFor } from "@/lib/seo";
import { AWAITING } from "@/lib/products";

const PATH = "/support";

export const metadata = seoFor(PATH);

const routes = [
  {
    title: "Buying a machine",
    text: "Questions about a machine, what is included, or price.",
    href: "/enquiry?intent=product",
  },
  {
    title: "Demonstrations",
    text: "Ask whether a demonstration can be arranged. Availability is awaiting confirmation.",
    href: "/enquiry?intent=product",
  },
  {
    title: "General repairs",
    text: "Help with a machine that needs attention. Repair arrangements are awaiting confirmation.",
    href: "/enquiry?intent=support",
  },
  {
    title: "Warranty service",
    text: "Questions about warranty. Warranty terms and authorised service are awaiting confirmation.",
    href: "/enquiry?intent=support",
  },
  {
    title: "Trade enquiries",
    text: "Retailers and wholesale buyers asking about the range.",
    href: "/enquiry?intent=trade",
  },
];

const coverage = [
  "Warranty terms",
  "Setup assistance",
  "Repair arrangements",
  "Authorised service coverage",
];

export default function SupportPage() {
  return (
    <>
      <section className="container section page-intro">
        <h1>
          Jtech sewing machine <span className="accent">support</span>
        </h1>
        <p className="lede">
          Ask about buying a machine, demonstrations, repairs, warranty or trade enquiries. Service
          availability and terms are awaiting confirmation.
        </p>
      </section>

      <section className="container section section--tight" aria-labelledby="help">
        <h2 id="help">
          How can we <span className="accent">help?</span>
        </h2>
        <ul className="route-grid">
          {routes.map((r) => (
            <li key={r.title}>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
              <Link href={r.href} className="link-arrow">
                Contact about this<span className="visually-hidden"> for {r.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="band band--light" aria-labelledby="coverage">
        <div className="container detail-cols">
          <div>
            <h2 id="coverage">Support information</h2>
            <p>
              Warranty terms, setup assistance, repair arrangements and authorised service coverage are
              awaiting confirmation. A repair-partner network is not currently confirmed.
            </p>
            <dl className="facts">
              {coverage.map((label) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="pending">{AWAITING}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div id="contact" tabIndex={-1}>
            <h2>Contact Jtech</h2>
            <p>
              Jtech&apos;s phone number, email and opening hours are awaiting confirmation. Until then, use
              the enquiry form and choose what you need help with.
            </p>
            <Link href="/enquiry" className="btn btn--primary">
              Open the enquiry form
            </Link>
          </div>
        </div>
      </section>

      <section className="container section detail-cols" aria-label="Learning and locations">
        <div>
          <h2>Learning resources</h2>
          <p>
            Verified tutorials are not yet available in this prototype. Resource languages are awaiting
            confirmation. Each <Link href="/machines">machine page</Link> lists what is known so far.
          </p>
        </div>
        <div>
          <h2>Locations and available services</h2>
          <p>Location details and the services available at each location are awaiting confirmation.</p>
          <Link href="/locations" className="link-arrow">
            View locations
          </Link>
        </div>
      </section>
    </>
  );
}
