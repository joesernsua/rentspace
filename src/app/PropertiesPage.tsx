import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { getProperties } from "../services/property.service";
import type { LegacyProperty as Property } from "../types/LegacyProperty";

const availabilityOptions = ["", "Available", "Unavailable", "Reserved"];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    location: "",
    maxRentalFee: "",
    rooms: "",
    availabilityStatus: "",
  });

  useEffect(() => {
    async function loadProperties() {
      try {
        const data = await getProperties();
        setProperties(data);
      } catch {
        setError("Unable to load properties. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesLocation = property.location
        .toLowerCase()
        .includes(filters.location.trim().toLowerCase());
      const matchesFee =
        !filters.maxRentalFee ||
        property.rentalFee <= Number(filters.maxRentalFee);
      const matchesRooms =
        !filters.rooms || property.numberOfRooms === Number(filters.rooms);
      const matchesAvailability =
        !filters.availabilityStatus ||
        property.availabilityStatus === filters.availabilityStatus;

      return (
        matchesLocation &&
        matchesFee &&
        matchesRooms &&
        matchesAvailability
      );
    });
  }, [filters, properties]);

  return (
    <main className="bg-background-200 font-serif text-primary-900">
      <section className="bg-background-700 px-4 py-16 text-background-50 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-secondary-300">
            Property Listings
          </p>
          <h1 className="text-3xl uppercase tracking-wider text-white md:text-5xl">
            Browse Rental Properties
          </h1>
          <p className="mt-4 max-w-3xl text-background-300">
            Explore available homes and submit a booking request when you find a
            property that suits your needs.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-7xl border border-white/10 bg-background-800/90 p-6 shadow-2xl md:p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-white outline-none transition-colors focus:border-secondary-400"
              placeholder="Filter by location"
              value={filters.location}
              onChange={(event) =>
                setFilters({ ...filters, location: event.target.value })
              }
            />
            <input
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-white outline-none transition-colors focus:border-secondary-400"
              type="number"
              min="0"
              placeholder="Max rental fee"
              value={filters.maxRentalFee}
              onChange={(event) =>
                setFilters({ ...filters, maxRentalFee: event.target.value })
              }
            />
            <input
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-white outline-none transition-colors focus:border-secondary-400"
              type="number"
              min="0"
              placeholder="Rooms"
              value={filters.rooms}
              onChange={(event) =>
                setFilters({ ...filters, rooms: event.target.value })
              }
            />
            <select
              className="border border-background-600 bg-background-900/40 px-4 py-3 text-white outline-none transition-colors focus:border-secondary-400"
              value={filters.availabilityStatus}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  availabilityStatus: event.target.value,
                })
              }
            >
              {availabilityOptions.map((option) => (
                <option key={option || "all"} value={option} className="bg-background-900">
                  {option || "All availability"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          {isLoading && <p>Loading properties...</p>}
          {error && <p className="text-secondary-700">{error}</p>}
          {!isLoading && !error && filteredProperties.length === 0 && (
            <p>No properties found.</p>
          )}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property) => (
              <article
                key={property.id}
                className="overflow-hidden border border-primary-900/10 bg-white/50 shadow-xl"
              >
                <div className="aspect-video bg-background-700">
                  {property.imageUrl ? (
                    <img
                      src={property.imageUrl}
                      alt={property.propertyName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-background-300">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary-600">
                    {property.availabilityStatus}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold uppercase tracking-wide">
                    {property.propertyName}
                  </h2>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-primary-700">Location</dt>
                      <dd className="text-right">{property.location}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-primary-700">Rental Fee</dt>
                      <dd>RM {property.rentalFee}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-primary-700">Rooms</dt>
                      <dd>{property.numberOfRooms}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-primary-700">Type</dt>
                      <dd>{property.propertyType}</dd>
                    </div>
                  </dl>
                  <Link
                    to={`/properties/${property.id}`}
                    className="mt-6 inline-block bg-secondary-400 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-background-900 transition-colors hover:bg-secondary-300"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
