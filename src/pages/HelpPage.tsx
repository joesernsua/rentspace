import { Link } from "react-router";
import PageIntro from "../components/PageIntro";

export default function HelpPage() {
  return (
    <PageIntro
      title="Help Centre"
      description="Quick guidance for using RentSpace as a tenant or property owner."
    >
      <div className="space-y-4">
        {[
          ["How do I find a property?", "Open Properties to search and filter all currently available listings."],
          ["How do I request a rental?", "Log in as a tenant, open a property, and submit the Request to Rent form."],
          ["How do owners add properties?", "Log in as an owner and use the property form inside the Owner Dashboard."],
        ].map(([question, answer]) => (
          <article key={question} className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold">{question}</h2>
            <p className="mt-2 text-slate-600">{answer}</p>
          </article>
        ))}
      </div>
      <Link to="/properties" className="mt-6 inline-flex rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">
        Browse Properties
      </Link>
    </PageIntro>
  );
}
