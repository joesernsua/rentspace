import { useEffect, useMemo, useState } from "react";
import { FiHeart, FiSliders } from "react-icons/fi";
import { Link, useSearchParams } from "react-router";
import { malaysiaLocations, malaysiaStates } from "../data/malaysiaLocations";
import { getAvailableProperties } from "../services/propertyService";
import type { Property } from "../types/Property";

type Direction = "asc" | "desc";

const directionOptions: Array<{ label: string; value: Direction }> = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
];

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

function getRating(property: Property) {
  const seed = `${property.id}${property.title}`;
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (4.72 + (total % 27) / 100).toFixed(total % 4 === 0 ? 1 : 2);
}

function getRatingValue(property: Property) {
  return Number(getRating(property));
}

function getListingLabel(property: Property) {
  return `${property.type} in ${property.location || "Malaysia"}`;
}

function getPropertyCoverImage(property: Property) {
  return property.imageUrls?.[0] || property.imageUrl;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );
  const selectedLabel = normalizedOptions.find((option) => option.value === value)?.label ?? (value || label);

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold outline-none transition ${
          isOpen
            ? "border-emerald-400 bg-slate-950 text-white shadow-lg shadow-emerald-500/10"
            : "border-slate-200 bg-white text-slate-900 hover:border-emerald-300 dark:border-white/10 dark:bg-slate-900 dark:text-white"
        }`}
      >
        <span className={value ? "" : "text-slate-500"}>{selectedLabel}</span>
        <span className={`text-lg transition ${isOpen ? "rotate-180 text-emerald-300" : "text-slate-400"}`} aria-hidden="true">
          ˅
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[999] max-h-80 w-full overflow-y-auto rounded-2xl border border-emerald-400/40 bg-slate-950 p-2 text-white shadow-2xl shadow-black/40 [scrollbar-color:#10b981_#0f172a] [scrollbar-width:thin]">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
              value === "" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </button>
          {normalizedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                value === option.value ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PropertyListingPage() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedArea, setSelectedArea] = useState(() => searchParams.get("location") ?? "");
  const [type, setType] = useState(() => searchParams.get("type") ?? "");
  const [rooms, setRooms] = useState("");
  const [priceSort, setPriceSort] = useState<Direction | "">("");
  const [popularSort, setPopularSort] = useState<Direction | "">("");
  const preferredStart = searchParams.get("start");
  const preferredEnd = searchParams.get("end");

  useEffect(() => {
    getAvailableProperties()
      .then(setProperties)
      .catch(() =>
        setError("Unable to load available properties. Please try again later."),
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = useMemo(() => {
    const stateSearch = selectedState.trim().toLowerCase();
    const areaSearch = selectedArea.trim().toLowerCase();

    return properties
      .filter((property) => {
        const locationValues = [property.location, property.address].map((value) => value.toLowerCase());
        const matchesState = !stateSearch || locationValues.some((value) => value.includes(stateSearch));
        const matchesArea = !areaSearch || locationValues.some((value) => value.includes(areaSearch));
        const matchesType = !type || property.type === type;
        const matchesRooms =
          !rooms ||
          (rooms === "4" ? property.rooms >= 4 : property.rooms === Number(rooms));

        return (
          matchesState &&
          matchesArea &&
          matchesType &&
          matchesRooms
        );
      })
      .sort((first, second) => {
        if (popularSort === "asc") return getRatingValue(first) - getRatingValue(second);
        if (popularSort === "desc") return getRatingValue(second) - getRatingValue(first);
        if (priceSort === "asc") return first.price - second.price;
        if (priceSort === "desc") return second.price - first.price;
        return (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0);
      });
  }, [properties, selectedState, selectedArea, type, rooms, priceSort, popularSort]);

  const clearFilters = () => {
    setSelectedState("");
    setSelectedArea("");
    setType("");
    setRooms("");
    setPriceSort("");
    setPopularSort("");
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-145px)] max-w-7xl px-4 pb-20 pt-10 text-slate-950 transition-colors dark:text-white sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-300">
            Properties
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            Browse rental homes.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Search and compare available listings from registered owners.
          </p>
        </div>

        <div className="relative z-40 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <FilterDropdown
            label="State"
            value={selectedState}
            options={malaysiaStates}
            onChange={(nextState) => {
              setSelectedState(nextState);
              setSelectedArea("");
            }}
          />
          <FilterDropdown
            label="Area"
            value={selectedArea}
            options={selectedState ? malaysiaLocations[selectedState] : Object.values(malaysiaLocations).flat()}
            onChange={setSelectedArea}
          />
          <FilterDropdown
            label="Price"
            value={priceSort}
            options={directionOptions}
            onChange={(value) => {
              setPriceSort(value as Direction | "");
              setPopularSort("");
            }}
          />
          <FilterDropdown
            label="Popular"
            value={popularSort}
            options={directionOptions}
            onChange={(value) => setPopularSort(value as Direction | "")}
          />
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <FiSliders />
            Clear filters
          </button>
        </div>

        {(preferredStart || preferredEnd) && (
          <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
            Preferred rental dates: {preferredStart || "Flexible"} to {preferredEnd || "Flexible"}
          </p>
        )}
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        {loading && (
          <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
            Loading available properties...
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}

        {!loading && !error && filteredProperties.length === 0 && (
          <p className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
            No properties found. Try adjusting your filters.
          </p>
        )}

        {!loading && !error && filteredProperties.length > 0 && (
          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  Available rentals
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {filteredProperties.length} rental option{filteredProperties.length === 1 ? "" : "s"} ready to view
                </p>
              </div>
              <Link
                to="/#home"
                className="text-sm font-black text-emerald-600 transition hover:text-slate-950 dark:text-emerald-300 dark:hover:text-white"
              >
                Back to home
              </Link>
            </div>

            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProperties.map((property) => (
                <Link
                  key={property.id}
                  to={`/properties/${property.id}`}
                  className="group block"
                >
                  <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 transition group-hover:-translate-y-1 group-hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/10 dark:group-hover:bg-slate-900">
                    <div className="relative overflow-hidden rounded-3xl bg-slate-100 dark:bg-background-700">
                      {getPropertyCoverImage(property) ? (
                        <img
                          src={getPropertyCoverImage(property)}
                          alt={property.title}
                          className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid aspect-square place-items-center bg-slate-100 px-6 text-center text-sm font-bold text-slate-500 dark:bg-background-700 dark:text-background-300">
                          No image available
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md">
                        Guest favorite
                      </span>
                      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-900 shadow-md transition group-hover:text-emerald-600">
                        <FiHeart />
                      </span>
                    </div>

                    <div className="mt-4 px-1 pb-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-1 font-black text-slate-950 dark:text-white">
                          {getListingLabel(property)}
                        </h3>
                        <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          ★ {getRating(property)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {property.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-500">
                        {property.rooms} room{property.rooms === 1 ? "" : "s"} · {property.bathrooms} bath{property.bathrooms === 1 ? "" : "s"} · {property.type}
                      </p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-black text-slate-950 dark:text-white">{formatPrice(property.price)}</span> / month
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
