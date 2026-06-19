import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import DatePicker from "../components/DatePicker";
import { propertyTypes, type PropertyType } from "../types/Property";

export default function HomePage() {
  const navigate = useNavigate();
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (propertyType) params.set("type", propertyType);
    if (location.trim()) params.set("location", location.trim());
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    navigate(`/properties${params.size ? `?${params.toString()}` : ""}`);
  };

  const today = new Date().toISOString().split("T")[0];
  const fieldClass =
    "mt-2 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";

  return (
    <main id="home" className="mx-auto min-h-[calc(100vh-145px)] max-w-7xl px-4 pb-20 pt-5 sm:px-6">
      <section className="relative min-h-[460px] overflow-hidden rounded-[2rem] bg-[url('/care.jpg')] bg-cover bg-center shadow-2xl shadow-slate-900/15 sm:min-h-[520px]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-emerald-900/20" />
        <div className="relative flex min-h-[460px] max-w-3xl flex-col justify-center px-7 pb-28 pt-16 text-white sm:min-h-[520px] sm:px-14 lg:px-20">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">Find your next home</p>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">Rent better.<br />Live comfortably.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg">Search trusted rental properties across Malaysia and connect directly with property owners.</p>
        </div>
      </section>

      <form id="properties" onSubmit={handleSearch} className="relative z-10 mx-auto -mt-20 grid max-w-6xl gap-0 overflow-visible rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30 md:grid-cols-[1.1fr_1.4fr_1fr_1fr_auto] md:rounded-[1.5rem]">
        <div className="relative border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors dark:border-white/10 dark:text-slate-400 md:border-b-0 md:border-r">
          Property
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={propertyMenuOpen}
            onClick={() => setPropertyMenuOpen((open) => !open)}
            className="mt-2 flex w-full items-center justify-between gap-3 text-left text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none dark:text-white"
          >
            <span>{propertyType || "All properties"}</span>
            <span className={`text-slate-500 transition-transform dark:text-slate-400 ${propertyMenuOpen ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {propertyMenuOpen && (
            <div className="absolute left-2 right-2 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-2xl shadow-slate-900/15 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:shadow-black/30" role="listbox">
              {["", ...propertyTypes].map((type) => {
                const selected = propertyType === type;
                return (
                  <button
                    key={type || "all"}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setPropertyType(type as PropertyType | "");
                      setPropertyMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${selected ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-white/10"}`}
                  >
                    <span>{type || "All properties"}</span>
                    {selected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <label className="border-b border-slate-200 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors dark:border-white/10 dark:text-slate-400 md:border-b-0 md:border-r">
          Location
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or neighbourhood" className={fieldClass} />
        </label>

        <DatePicker label="Move-in" min={today} value={startDate} onChange={(value) => { setStartDate(value); if (endDate && value && endDate < value) setEndDate(""); }} />

        <DatePicker label="Move-out" min={startDate || today} value={endDate} onChange={setEndDate} />

        <button className="m-1 rounded-xl bg-indigo-600 px-7 py-4 font-bold text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-500">Search</button>
      </form>

      <section className="mx-auto mt-16 grid max-w-6xl gap-5 md:grid-cols-3">
        {[
          ["Verified listings", "Browse clear property details from registered owners."],
          ["Simple applications", "Send rental requests and track every status update."],
          ["One rental hub", "Manage properties and applications from one dashboard."],
        ].map(([title, description]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 h-2 w-12 rounded-full bg-emerald-400" />
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 leading-6 text-slate-600 dark:text-slate-400">{description}</p>
          </article>
        ))}
      </section>

      <section id="about-us" className="mx-auto mt-20 max-w-6xl scroll-mt-28">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900 sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-500 dark:text-emerald-300">About Us</p>
          <h2 className="mt-4 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">One rental space for tenants and owners.</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600 dark:text-slate-400">
            RentSpace brings rental discovery, listing management, and application tracking into one place so people can move faster with less noise.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["Find a Home", "Browse available rental properties and compare the details that matter."],
              ["Manage Listings", "Owners can publish properties and manage rental applications in one place."],
              ["Rent with Clarity", "Clear roles and request statuses help everyone follow the rental journey."],
            ].map(([title, description]) => (
              <article key={title} className="rounded-2xl bg-slate-50 p-6 transition-colors dark:bg-white/5">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-2 leading-6 text-slate-600 dark:text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="help" className="mx-auto mt-20 max-w-6xl scroll-mt-28">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900 sm:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-500 dark:text-emerald-300">Help</p>
          <h2 className="mt-4 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">Quick guidance</h2>
          <div className="mt-8 space-y-4">
            {[
              ["How do I find a property?", "Open Properties to search and filter all currently available listings."],
              ["How do I request a rental?", "Log in as a tenant, open a property, and submit the Request to Rent form."],
              ["How do owners add properties?", "Log in as an owner and use the property form inside the Owner Dashboard."],
            ].map(([question, answer]) => (
              <article key={question} className="rounded-2xl border border-slate-200 p-6 transition-colors dark:border-white/10">
                <h3 className="font-bold text-slate-950 dark:text-white">{question}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
