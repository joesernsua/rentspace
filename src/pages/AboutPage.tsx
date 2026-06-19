import PageIntro from "../components/PageIntro";

export default function AboutPage() {
  return (
    <PageIntro
      title="About RentSpace"
      description="RentSpace brings tenants and property owners together through a simple, transparent rental management platform."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          ["Find a Home", "Browse available rental properties and compare the details that matter."],
          ["Manage Listings", "Owners can publish properties and manage rental applications in one place."],
          ["Rent with Clarity", "Clear roles and request statuses help everyone follow the rental journey."],
        ].map(([title, description]) => (
          <article key={title} className="rounded-2xl bg-slate-50 p-6">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </div>
    </PageIntro>
  );
}
