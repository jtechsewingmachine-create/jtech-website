import { seoFor } from "@/lib/seo";
import { ConfirmationDetails } from "@/components/ConfirmationDetails";

const PATH = "/enquiry/confirmation";

export const metadata = seoFor(PATH);

export default function ConfirmationPage() {
  return (
    <section className="container section confirmation">
      <h1>Your Jtech enquiry</h1>
      <ConfirmationDetails />
    </section>
  );
}
