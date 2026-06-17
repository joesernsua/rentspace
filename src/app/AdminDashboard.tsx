import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth, type UserProfile } from "../context/AuthContext";
import {
  getAdminAppointments,
  getAdminBookings,
  getAdminEnquiries,
  getAdminProperties,
  getUsers,
} from "../services/admin.service";
import { updateBookingStatus } from "../services/booking.service";
import {
  createProperty,
  deleteProperty,
  updateProperty,
} from "../services/property.service";
import type { Appointment } from "../types/appointment";
import type { Booking } from "../types/booking";
import type { Enquiry } from "../types/enquiry";
import type { Property } from "../types/property";

const initialPropertyForm = {
  propertyName: "",
  location: "",
  rentalFee: "",
  numberOfRooms: "",
  propertyType: "",
  facilities: "",
  imageUrl: "",
  availabilityStatus: "Available",
  description: "",
};

type PropertyFormData = typeof initialPropertyForm;
type AdminSection =
  | "overview"
  | "users"
  | "enquiries"
  | "appointments"
  | "bookings"
  | "properties";

const adminSections: Array<{ id: AdminSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "enquiries", label: "Enquiries" },
  { id: "appointments", label: "Appointments" },
  { id: "bookings", label: "Bookings" },
  { id: "properties", label: "Properties" },
];

function formatValue(value: unknown): string {
  if (!value) {
    return "-";
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toLocaleString();
  }

  return String(value);
}

function mapPropertyToForm(property: Property): PropertyFormData {
  return {
    propertyName: property.propertyName,
    location: property.location,
    rentalFee: String(property.rentalFee),
    numberOfRooms: String(property.numberOfRooms),
    propertyType: property.propertyType,
    facilities: property.facilities,
    imageUrl: property.imageUrl,
    availabilityStatus: property.availabilityStatus,
    description: property.description,
  };
}

function mapFormToProperty(formData: PropertyFormData) {
  return {
    propertyName: formData.propertyName.trim(),
    location: formData.location.trim(),
    rentalFee: Number(formData.rentalFee),
    numberOfRooms: Number(formData.numberOfRooms),
    propertyType: formData.propertyType.trim(),
    facilities: formData.facilities.trim(),
    imageUrl: formData.imageUrl.trim(),
    availabilityStatus: formData.availabilityStatus.trim(),
    description: formData.description.trim(),
  };
}

export default function AdminDashboard() {
  const { currentUser, userProfile, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [formData, setFormData] = useState(initialPropertyForm);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(
    null,
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] =
    useState<AdminSection>("overview");

  const isAdmin = userProfile?.role === "admin";

  const summaryCards = useMemo(
    () => [
      { label: "Total Users", value: users.length },
      { label: "Total Enquiries", value: enquiries.length },
      { label: "Total Appointments", value: appointments.length },
      { label: "Total Bookings", value: bookings.length },
      { label: "Total Properties", value: properties.length },
    ],
    [
      appointments.length,
      bookings.length,
      enquiries.length,
      properties.length,
      users.length,
    ],
  );

  const loadDashboardData = async () => {
    setIsLoadingData(true);
    setFeedback(null);

    try {
      const [
        usersData,
        enquiriesData,
        appointmentsData,
        bookingsData,
        propertiesData,
      ] =
        await Promise.all([
          getUsers(),
          getAdminEnquiries(),
          getAdminAppointments(),
          getAdminBookings(),
          getAdminProperties(),
        ]);

      setUsers(usersData);
      setEnquiries(enquiriesData);
      setAppointments(appointmentsData);
      setBookings(bookingsData);
      setProperties(propertiesData);
    } catch {
      setFeedback("Unable to load admin data. Please check your admin access.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadDashboardData();
    }
  }, [isAdmin]);

  const handleSubmitProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const propertyData = mapFormToProperty(formData);

      if (editingPropertyId) {
        await updateProperty(editingPropertyId, propertyData);
        setFeedback("Property updated successfully.");
      } else {
        await createProperty(propertyData);
        setFeedback("Property created successfully.");
      }

      setFormData(initialPropertyForm);
      setEditingPropertyId(null);
      await loadDashboardData();
    } catch {
      setFeedback("Unable to save property. Please complete all fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProperty = (property: Property) => {
    if (!property.id) {
      return;
    }

    setEditingPropertyId(property.id);
    setFormData(mapPropertyToForm(property));
    setFeedback(null);
  };

  const handleDeleteProperty = async (propertyId?: string) => {
    if (!propertyId) {
      return;
    }

    setFeedback(null);

    try {
      await deleteProperty(propertyId);
      setFeedback("Property deleted successfully.");
      await loadDashboardData();
    } catch {
      setFeedback("Unable to delete property.");
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string | undefined,
    status: Booking["status"],
  ) => {
    if (!bookingId) {
      return;
    }

    setFeedback(null);

    try {
      await updateBookingStatus(bookingId, status);
      setFeedback("Booking status updated successfully.");
      await loadDashboardData();
    } catch {
      setFeedback("Unable to update booking status.");
    }
  };

  if (loading) {
    return (
      <main className="bg-background-200 px-4 py-20 font-serif text-primary-900 md:px-8">
        <div className="mx-auto max-w-7xl">Loading admin access...</div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="bg-background-200 px-4 py-20 font-serif text-primary-900 md:px-8">
        <div className="mx-auto max-w-7xl">
          Please login to access the admin dashboard.
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="bg-background-200 px-4 py-20 font-serif text-primary-900 md:px-8">
        <div className="mx-auto max-w-7xl">Access denied. Admin only.</div>
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
        <div className="mx-auto max-w-[1500px]">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-secondary-300">
            Admin Dashboard
          </p>
          <h1 className="text-3xl uppercase tracking-wider text-white md:text-5xl">
            Property Rental Management System
          </h1>
          <p className="mt-4 max-w-3xl text-background-300">
            Monitor users, enquiries, appointments, and manage rental property
            records.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit border border-primary-900/10 bg-background-700 p-4 text-background-50 shadow-2xl lg:sticky lg:top-24">
            <p className="mb-4 px-3 text-xs uppercase tracking-[0.3em] text-secondary-300">
              Sections
            </p>
            <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {adminSections.map((section) => {
                const isActive = selectedSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSection(section.id)}
                    className={`whitespace-nowrap px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.18em] transition-colors ${
                      isActive
                        ? "bg-secondary-400 text-background-900"
                        : "text-background-100 hover:bg-background-800 hover:text-white"
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            {isLoadingData && (
              <p className="mb-6 text-sm uppercase tracking-widest text-secondary-600">
                Loading admin data...
              </p>
            )}

            {selectedSection === "overview" && (
              <OverviewSection summaryCards={summaryCards} />
            )}

            {selectedSection === "users" && (
              <DataTable
                title="Users"
                headers={["Display Name", "Email", "Role", "Created At"]}
                rows={users.map((user) => [
                  formatValue(user.displayName),
                  formatValue(user.email),
                  formatValue(user.role),
                  formatValue(user.createdAt),
                ])}
              />
            )}

            {selectedSection === "enquiries" && (
              <DataTable
                title="Enquiries"
                headers={["Name", "Email", "Phone", "Message", "Created At"]}
                rows={enquiries.map((enquiry) => [
                  formatValue(enquiry.name),
                  formatValue(enquiry.email),
                  formatValue(enquiry.phone),
                  formatValue(enquiry.message),
                  formatValue(enquiry.createdAt),
                ])}
              />
            )}

            {selectedSection === "appointments" && (
              <DataTable
                title="Appointments"
                headers={[
                  "Name",
                  "Email",
                  "Phone",
                  "Date",
                  "Message",
                  "Created At",
                ]}
                rows={appointments.map((appointment) => [
                  formatValue(appointment.name),
                  formatValue(appointment.email),
                  formatValue(appointment.phone),
                  formatValue(appointment.preferredDate),
                  formatValue(appointment.message),
                  formatValue(appointment.createdAt),
                ])}
              />
            )}

            {selectedSection === "bookings" && (
              <BookingsTable
                bookings={bookings}
                onUpdateStatus={handleUpdateBookingStatus}
              />
            )}

            {selectedSection === "properties" && (
              <PropertiesSection
                editingPropertyId={editingPropertyId}
                feedback={feedback}
                formData={formData}
                inputClassName={inputClassName}
                isSubmitting={isSubmitting}
                labelClassName={labelClassName}
                properties={properties}
                setEditingPropertyId={setEditingPropertyId}
                setFormData={setFormData}
                onDelete={handleDeleteProperty}
                onEdit={handleEditProperty}
                onSubmit={handleSubmitProperty}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function OverviewSection({
  summaryCards,
}: {
  summaryCards: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
      {summaryCards.map((card) => (
        <div
          key={card.label}
          className="border border-primary-900/10 bg-white/40 p-6 shadow-xl"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-secondary-600">
            {card.label}
          </p>
          <p className="mt-3 text-4xl font-bold text-primary-900">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PropertiesSection({
  editingPropertyId,
  feedback,
  formData,
  inputClassName,
  isSubmitting,
  labelClassName,
  properties,
  setEditingPropertyId,
  setFormData,
  onDelete,
  onEdit,
  onSubmit,
}: {
  editingPropertyId: string | null;
  feedback: string | null;
  formData: PropertyFormData;
  inputClassName: string;
  isSubmitting: boolean;
  labelClassName: string;
  properties: Property[];
  setEditingPropertyId: (propertyId: string | null) => void;
  setFormData: (formData: PropertyFormData) => void;
  onDelete: (propertyId?: string) => void;
  onEdit: (property: Property) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="border border-white/10 bg-background-800/90 p-6 text-background-50 shadow-2xl md:p-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-secondary-300">
              Property Management
            </p>
            <h2 className="mt-2 text-3xl uppercase tracking-wider text-white">
              {editingPropertyId ? "Edit Property" : "Create Property"}
            </h2>
          </div>
          {editingPropertyId && (
            <button
              type="button"
              className="border border-secondary-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary-300 transition-colors hover:bg-secondary-400 hover:text-background-900"
              onClick={() => {
                setEditingPropertyId(null);
                setFormData(initialPropertyForm);
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
          onSubmit={onSubmit}
        >
          <label className={labelClassName}>
            Property Name
            <input
              className={inputClassName}
              value={formData.propertyName}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  propertyName: event.target.value,
                })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Location
            <input
              className={inputClassName}
              value={formData.location}
              onChange={(event) =>
                setFormData({ ...formData, location: event.target.value })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Rental Fee
            <input
              className={inputClassName}
              type="number"
              min="0"
              value={formData.rentalFee}
              onChange={(event) =>
                setFormData({ ...formData, rentalFee: event.target.value })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Number Of Rooms
            <input
              className={inputClassName}
              type="number"
              min="0"
              value={formData.numberOfRooms}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  numberOfRooms: event.target.value,
                })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Property Type
            <input
              className={inputClassName}
              value={formData.propertyType}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  propertyType: event.target.value,
                })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={labelClassName}>
            Availability
            <select
              className={inputClassName}
              value={formData.availabilityStatus}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  availabilityStatus: event.target.value,
                })
              }
              disabled={isSubmitting}
            >
              <option className="bg-background-900">Available</option>
              <option className="bg-background-900">Unavailable</option>
              <option className="bg-background-900">Reserved</option>
            </select>
          </label>

          <label className={`${labelClassName} md:col-span-2`}>
            Facilities
            <input
              className={inputClassName}
              value={formData.facilities}
              onChange={(event) =>
                setFormData({ ...formData, facilities: event.target.value })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={`${labelClassName} md:col-span-2`}>
            Image URL
            <input
              className={inputClassName}
              value={formData.imageUrl}
              onChange={(event) =>
                setFormData({ ...formData, imageUrl: event.target.value })
              }
              disabled={isSubmitting}
            />
          </label>

          <label className={`${labelClassName} md:col-span-2`}>
            Description
            <textarea
              className={`${inputClassName} min-h-32 resize-y`}
              value={formData.description}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  description: event.target.value,
                })
              }
              disabled={isSubmitting}
            />
          </label>

          {feedback && (
            <p className="text-sm text-secondary-300 md:col-span-2">
              {feedback}
            </p>
          )}

          <button
            type="submit"
            className="bg-secondary-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-background-900 transition-colors hover:bg-secondary-300 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 md:justify-self-start"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : editingPropertyId
                ? "Update Property"
                : "Create Property"}
          </button>
        </form>
      </div>

      <PropertiesTable
        properties={properties}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="mb-10 overflow-hidden border border-primary-900/10 bg-white/40 shadow-xl">
      <h2 className="border-b border-primary-900/10 px-6 py-4 text-xl font-bold uppercase tracking-widest text-primary-900">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-background-700 text-background-50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 uppercase tracking-widest">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-primary-900/10">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6" colSpan={headers.length}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingsTable({
  bookings,
  onUpdateStatus,
}: {
  bookings: Booking[];
  onUpdateStatus: (bookingId: string | undefined, status: Booking["status"]) => void;
}) {
  return (
    <div className="overflow-hidden border border-primary-900/10 bg-white/40 shadow-xl">
      <h2 className="border-b border-primary-900/10 px-6 py-4 text-xl font-bold uppercase tracking-widest text-primary-900">
        Bookings
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-background-700 text-background-50">
            <tr>
              {[
                "Customer",
                "Email",
                "Property",
                "Booking Date",
                "Check-In",
                "Check-Out",
                "Message",
                "Status",
                "Actions",
              ].map((header) => (
                <th key={header} className="px-4 py-3 uppercase tracking-widest">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-t border-primary-900/10">
                  <td className="px-4 py-3">{booking.customerName}</td>
                  <td className="px-4 py-3">{booking.customerEmail}</td>
                  <td className="px-4 py-3">{booking.propertyName}</td>
                  <td className="px-4 py-3">{booking.bookingDate}</td>
                  <td className="px-4 py-3">{booking.checkInDate}</td>
                  <td className="px-4 py-3">{booking.checkOutDate}</td>
                  <td className="px-4 py-3">{formatValue(booking.message)}</td>
                  <td className="px-4 py-3 font-bold uppercase tracking-widest">
                    {booking.status}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="border border-primary-900/20 bg-white/70 px-3 py-2 text-primary-900"
                      value={booking.status}
                      onChange={(event) =>
                        onUpdateStatus(
                          booking.id,
                          event.target.value as Booking["status"],
                        )
                      }
                    >
                      <option value="pending">pending</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6" colSpan={9}>
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PropertiesTable({
  properties,
  onEdit,
  onDelete,
}: {
  properties: Property[];
  onEdit: (property: Property) => void;
  onDelete: (propertyId?: string) => void;
}) {
  return (
    <div className="overflow-hidden border border-primary-900/10 bg-white/40 shadow-xl">
      <h2 className="border-b border-primary-900/10 px-6 py-4 text-xl font-bold uppercase tracking-widest text-primary-900">
        Properties
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-background-700 text-background-50">
            <tr>
              {[
                "Name",
                "Location",
                "Rental Fee",
                "Rooms",
                "Type",
                "Status",
                "Updated At",
                "Actions",
              ].map((header) => (
                <th key={header} className="px-4 py-3 uppercase tracking-widest">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {properties.length > 0 ? (
              properties.map((property) => (
                <tr
                  key={property.id}
                  className="border-t border-primary-900/10"
                >
                  <td className="px-4 py-3">{property.propertyName}</td>
                  <td className="px-4 py-3">{property.location}</td>
                  <td className="px-4 py-3">{property.rentalFee}</td>
                  <td className="px-4 py-3">{property.numberOfRooms}</td>
                  <td className="px-4 py-3">{property.propertyType}</td>
                  <td className="px-4 py-3">{property.availabilityStatus}</td>
                  <td className="px-4 py-3">
                    {formatValue(property.updatedAt)}
                  </td>
                  <td className="space-x-3 px-4 py-3">
                    <button
                      type="button"
                      className="font-bold uppercase tracking-widest text-secondary-600 hover:text-secondary-800"
                      onClick={() => onEdit(property)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="font-bold uppercase tracking-widest text-primary-700 hover:text-primary-900"
                      onClick={() => onDelete(property.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6" colSpan={8}>
                  No properties found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
