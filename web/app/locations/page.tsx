import Link from "next/link";
import { seoFor } from "@/lib/seo";
import { locations } from "@/lib/locations";

const PATH = "/locations";

export const metadata = seoFor(PATH);

export default function LocationsPage() {
  return (
    <>
      <section className="container section page-intro">
        <h1>
          Jtech sewing machine <span className="accent">locations</span>
        </h1>
        <p className="lede">
          Find where to see a machine, get a repair or ask about warranty service. Real location details
          and available services are awaiting confirmation.
        </p>
        <p className="notice" role="note">
          <strong>Prototype locations:</strong> the examples below are fictional and demonstrate the page
          layout. They are not real Jtech locations or confirmed service points.
        </p>
      </section>

      <section className="container section section--tight" aria-labelledby="examples">
        <h2 id="examples">Example locations</h2>
        {locations.length > 0 ? (
          <ul className="location-list">
            {locations.map((l) => (
              <li key={l.id}>
                <p className="tag">Fictional example</p>
                <h3>{l.name}</h3>
                <p className="small">{l.area}</p>
                <p className="location-list__services">
                  <span className="visually-hidden">Services: </span>
                  {l.services.join(" · ")}
                </p>
                <Link href="/enquiry?intent=support" className="link-arrow">
                  Ask about service near me<span className="visually-hidden"> at {l.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>No location information available</h3>
            <p>You can still make a general enquiry using the prototype form.</p>
            <Link href="/enquiry?intent=support" className="btn btn--primary">
              Contact support
            </Link>
          </div>
        )}
      </section>

      <section className="container section">
        <h2 className="h-small">Not sure where to go?</h2>
        <p>
          Describe what you need and your town in the enquiry form, or read the{" "}
          <Link href="/support">support page</Link> for what Jtech can help with.
        </p>
      </section>
    </>
  );
}
