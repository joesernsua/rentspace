import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { createBooking } from "../services/booking.service";
import { getPropertyById } from "../services/property.service";
import type { LegacyProperty as Property } from "../types/LegacyProperty";

const initialBookingForm = {
  bookingDate: "",
  checkInDate: "",
  checkOutDate: "",
  message: "",
};

export default function PropertyDetails() {
  const { id } = useParams();
  const { currentUser, userProfile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialBookingForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setProperty(await getPropertyById(id));
      } catch {
        setFeedback("Unable to load property details.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProperty();
  }, [id]);

  const handleSubmitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!currentUser) {
      setFeedback("Please login before submitting a booking request.");
      return;
    }

    if (!property?.id) {
      setFeedback("Property details are unavailable.");
      return;
    }

    if (!formData.bookingDate || !formData.checkInDate || !formData.checkOutDate) {
      setFeedback("Please complete all booking date fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createBooking({
        customerId: currentUser.uid,
        customerName:
          userProfile?.displayName ?? currentUser.displayName ?? "Customer",
        customerEmail: userProfile?.email ?? currentUser.email ?? "",
        propertyId: property.id,
        propertyName: property.propertyName,
        ownerId: property.ownerId,
        bookingDate: formData.bookingDate,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        message: formData.message.trim(),
      });

      setFormData(initialBookingForm);
      setFeedback("Your booking request has been submitted.");
    } catch {
      setFeedback("Unable to submit booking request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="bg-background-200 px-4 py-20 font-serif text-primary-900 md:px-8">
        <div className="mx-auto max-w-7xl">Loading property details...</div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="bg-background-200 px-4 py-20 font-serif text-primary-900 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p>Property not found.</p>
          <Link to="/properties" className="mt-4 inline-block underline">
            Back to properties
          </Link>
        </div>
      </main>
    );
  }

  const inputClassName =
    "border border-background-600 bg-background-900/40 px-4 py-3 text-base normal-case tracking-normal text-white outline-none transition-colors focus:border-secondary-400";
  const labelClassName =
    "flex flex-col gap-2 text-sm uppercase tracking-widest text-secondary-300";

  return (
    <main className="bg-background-200 font-serif text-primary-900">
      <section className="bg-background-700 px-4 py-16 text-background-50 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Link to="/properties" className="text-sm uppercase tracking-widest text-secondary-300">
            Back to properties
          </Link>
          <h1 className="mt-4 text-3xl uppercase tracking-wider text-white md:text-5xl">
            {property.propertyName}
          </h1>
          <p className="mt-4 text-background-300">{property.location}</p>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="overflow-hidden border border-primary-900/10 bg-white/50 shadow-xl">
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
                <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Detail label="Rental Fee" value={`RM ${property.rentalFee}`} />
                  <Detail label="Rooms" value={String(property.numberOfRooms)} />
                  <Detail label="Type" value={property.propertyType} />
                  <Detail label="Facilities" value={property.facilities} />
                </dl>
                <p className="mt-6 leading-relaxed">{property.description}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <form
              className="grid grid-cols-1 gap-6 border border-white/10 bg-background-800/90 p-6 text-background-50 shadow-2xl md:p-8"
              onSubmit={handleSubmitBooking}
            >
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-secondary-300">
                  Booking Request
                </p>
                <h2 className="mt-2 text-2xl uppercase tracking-wider text-white">
                  Submit Booking Request
                </h2>
              </div>

              {!currentUser && (
                <p className="text-sm text-secondary-300">
                  Please login before booking this property.
                </p>
              )}

              <label className={labelClassName}>
                Booking Date
                <input
                  className={inputClassName}
                  type="date"
                  value={formData.bookingDate}
                  onChange={(event) =>
                    setFormData({ ...formData, bookingDate: event.target.value })
                  }
                  disabled={isSubmitting}
                />
              </label>

              <label className={labelClassName}>
                Check-In Date
                <input
                  className={inputClassName}
                  type="date"
                  value={formData.checkInDate}
                  onChange={(event) =>
                    setFormData({ ...formData, checkInDate: event.target.value })
                  }
                  disabled={isSubmitting}
                />
              </label>

              <label className={labelClassName}>
                Check-Out Date
                <input
                  className={inputClassName}
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(event) =>
                    setFormData({ ...formData, checkOutDate: event.target.value })
                  }
                  disabled={isSubmitting}
                />
              </label>

              <label className={labelClassName}>
                Message
                <textarea
                  className={`${inputClassName} min-h-28 resize-y`}
                  value={formData.message}
                  onChange={(event) =>
                    setFormData({ ...formData, message: event.target.value })
                  }
                  disabled={isSubmitting}
                />
              </label>

              {feedback && (
                <p className="text-sm text-secondary-300" role="status">
                  {feedback}
                </p>
              )}

              <button
                type="submit"
                className="bg-secondary-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-background-900 transition-colors hover:bg-secondary-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Booking Request"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-primary-900/10 bg-white/40 p-4">
      <dt className="text-xs uppercase tracking-[0.2em] text-secondary-600">
        {label}
      </dt>
      <dd className="mt-2 font-bold">{value || "-"}</dd>
    </div>
  );
}
