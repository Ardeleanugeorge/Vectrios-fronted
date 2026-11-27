"use client"
import Header from "@/components/Header"
import SiteFooter from "@/components/SiteFooter"

// How VectriOS reads a site and what it shows. Rewritten 26 Nov 2026, when the
// experimental score left the product: every line below describes something
// the product does today.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 border-b border-gray-200 pb-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">{title}</h2>
      <div className="space-y-4 text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

const FIELDS: { label: string; how: string }[] = [
  { label: "Headline, subheadline, buttons", how: "Read from the homepage as a browser renders it, and kept only if the homepage text also contains them, so a cookie banner or a pop-up is never reported as your headline. Buttons are those in the first screen, up to about 600 pixels below the headline, outside the navigation; a video's play button and a form's “Go” are not counted." },
  { label: "Who it is for", how: "A sentence that names a kind of buyer as the one the product is for (“built for…”, “for…”, “helps…”): a role, a team, a company type or size, or an industry. “Your team”, a customer count, or a buyer merely mentioned does not count." },
  { label: "What it says it is", how: "The sentence that states the product's category." },
  { label: "Main promise", how: "The sentence that states the main result for the customer." },
  { label: "Customers or users stated", how: "A sentence with a count of customers or users (“Trusted by 30,000+ customers”); the largest one is shown as written, with what was counted." },
  { label: "Ratings and awards", how: "A rating or an award from a review or analyst site, such as “4.7 stars on G2” or “a Leader in the G2 Grid”." },
  { label: "Customer results", how: "A named customer with a number, such as a case-study title. Product screenshots and plan limits are not counted." },
  { label: "Where claims are read", how: "Headline, who it is for, what it says it is and the main promise are read on the company's own pages. Pages about customers (case studies, customer stories) and anything inside quotation marks, such as a testimonial, are read for proof only, never as the company's claim." },
  { label: "Pricing", how: "Whether the pricing page shows prices, a free plan or a free trial, and a sales contact. Prices themselves are not copied: a monthly/annual switch can run them together in the page text." },
]

export default function MethodologyPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Methodology</p>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">How VectriOS reads a website</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            VectriOS reads the public key pages of your site and of up to five competitors every night, and shows what each one
            says: quoted, with the page it says it on. It reports a change once two consecutive nightly readings confirm it.
            It shows no score.
          </p>
        </div>

        <Section title="1. Which pages are read">
          <p>
            The homepage and up to four key pages: pricing, product, solutions, customers. Pages are found from the site&apos;s own
            links and checked to exist; the same rules choose the pages for every site, and they are tested against a labelled set
            of pages. Pages in another language than the homepage are left out of what is shown.
          </p>
        </Section>

        <Section title="2. What is shown, and how it is found">
          <p>
            Every line is either a sentence copied from a page and checked to appear there, or a count of things a reader can find on
            the page, or &ldquo;not found&rdquo;. &ldquo;Not found&rdquo; means no sentence on the pages read says it, not that the
            site never does.
          </p>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white">
            {FIELDS.map((f) => (
              <div key={f.label} className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-6 px-5 py-4">
                <p className="font-semibold text-gray-900">{f.label}</p>
                <p className="text-sm">{f.how}</p>
              </div>
            ))}
          </div>
          <p>
            A language model is used for one task only: pointing at the sentence that says who the product is for, what it is and
            what it promises. Whatever it points at is kept only if it occurs word for word on the page it names, so it can miss a
            sentence but cannot add one. Everything else is found by fixed rules.
          </p>
        </Section>

        <Section title="3. Your site next to your competitors">
          <p>
            The dashboard and the report put your site and each competitor on the same lines. Where you differ is stated with a fixed
            sentence over what was found, for example &ldquo;2 of 4 competitors cite a rating or award such as G2, Capterra or Gartner; none was found on the
            pages of your site that were read&rdquo;. Only competitors that were read are counted.
          </p>
        </Section>

        <Section title="4. What counts as a change">
          <p>
            A new homepage headline, or a new line on who it is for, what it says it is, its promise, customer or user count, ratings and awards, prices, free offer or sales contact - yours or a competitor&apos;s - read on two nightly readings in a row. A quoted line counts as changed only when the old quote is gone from the pages. A change that shows for one night and goes back, such as an A/B test, is not reported. You see the
            old and the new text and the dates of the readings.
          </p>
        </Section>

        <Section title="5. What VectriOS does not do">
          <p>
            It does not grade writing, design or SEO, and it does not turn what a page says into revenue or conversion figures.
            Connecting Search Console, GA4 or HubSpot adds their own figures next to the readings; VectriOS does not estimate them.
          </p>
        </Section>

        <Section title="6. The experimental score">
          <p>
            VectriOS developed an experimental messaging score. Controlled tests on a frozen set of 496 sites showed that parts of it
            did not respond to the changes they were meant to measure, and that rewording or a cookie notice could move it. The score
            was therefore withdrawn from the product and from the public benchmark on 26 November 2026. It returns only if a rebuilt
            version passes predefined tests and a human evaluation.
          </p>
        </Section>

      </main>
      <SiteFooter />
    </div>
  )
}
