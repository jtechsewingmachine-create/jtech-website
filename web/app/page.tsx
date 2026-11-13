import { seoFor } from "@/lib/seo";

const PATH = "/";

export const metadata = seoFor(PATH);

// Placeholder until F-03 builds the real homepage.
export default function Home() {
  return (
    <article>
      <h1>Jtech sewing machines</h1>
      <p>
        Explore machines, understand what&apos;s included, and find out what to
        consider before choosing. Private prototype with sample content.
      </p>
      <h2>What would you like to sew?</h2>
      <p>
        Start with the projects you have in mind: everyday repairs and
        alterations, learning to sew, or creative sewing projects. Each machine
        page explains what the machine is suited to, what comes with it, and
        which details are still awaiting confirmation.
      </p>
    </article>
  );
}
