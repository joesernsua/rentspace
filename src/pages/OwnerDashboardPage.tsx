import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getConversationId } from "../services/chatService";
import {
  createProperty,
  deleteProperty,
  getOwnerProperties,
  updateProperty,
} from "../services/propertyService";
import {
  approveRentalRequestWithPayment,
  getOwnerRentalRequests,
  updateRentalRequestStatus,
} from "../services/rentalRequestService";
import {
  propertyStatuses,
  propertyTypes,
  type CreatePropertyData,
  type Property,
} from "../types/Property";
import type {
  RentalRequest,
  RentalRequestStatus,
} from "../types/RentalRequest";

type FormData = Omit<CreatePropertyData, "ownerId">;
type HostSection = "overview" | "properties" | "requests";

const emptyForm: FormData = {
  title: "",
  location: "",
  address: "",
  price: 0,
  type: "Room",
  rooms: 0,
  bathrooms: 0,
  description: "",
  imageUrl: "",
  imageUrls: [],
  status: "available",
};

function parseImageUrls(value: string) {
  return value.trim();
}

function getPropertyCoverImage(property: Property) {
  return property.imageUrls?.[0] || property.imageUrl;
}

const sidebarItems: Array<{
  id: HostSection;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "properties", label: "Properties" },
  { id: "requests", label: "Requests" },
];

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

function getSavePropertyErrorMessage(error: unknown, action: "create" | "update") {
  const code = (error as { code?: string })?.code;

  if (code === "permission-denied") {
    return "Permission denied. Please publish the updated Firestore rules so owner accounts can create properties.";
  }

  return `Unable to ${action} the property. Please try again.`;
}

function getRequestUpdateErrorMessage(error: unknown, action: "approve" | "reject") {
  const code = (error as { code?: string })?.code;

  if (code === "permission-denied") {
    return `Permission denied. Please publish the updated Firestore rules and make sure this request belongs to your owner account before you ${action} it.`;
  }

  return `Unable to ${action} the request with payment details.`;
}

export default function OwnerDashboardPage() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<HostSection>("overview");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<RentalRequest | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    rentDeposit: "",
    utilityDeposit: "",
    monthlyRent: "",
  });

  const loadProperties = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      setProperties(await getOwnerProperties(currentUser.uid));
    } catch {
      setError("Unable to load your properties. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const items = await getOwnerRentalRequests(currentUser.uid);
      setRequests(
        items.sort(
          (first, second) =>
            (second.createdAt?.toMillis() ?? 0) -
            (first.createdAt?.toMillis() ?? 0),
        ),
      );
    } catch {
      setRequestsError("Unable to load rental requests. Please try again.");
    } finally {
      setRequestsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadProperties();
    void loadRequests();
  }, [loadProperties, loadRequests]);

  useEffect(() => {
    if (location.hash !== "#add-property") return;
    setActiveSection("properties");
    setIsPropertyFormOpen(true);
    window.setTimeout(() => {
      document.getElementById("add-property")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [location.hash]);

  const stats = useMemo(() => {
    const available = properties.filter((property) => property.status === "available").length;
    const rented = properties.filter((property) => property.status === "rented").length;
    const pendingRequests = requests.filter((request) => request.status === "pending").length;
    const monthlyRent = properties.reduce(
      (sum, property) => sum + (property.status === "rented" ? property.price : 0),
      0,
    );

    return [
      { label: "Total listings", value: properties.length.toLocaleString(), detail: `${available} available` },
      { label: "Pending requests", value: pendingRequests.toLocaleString(), detail: "Need review" },
      { label: "Active rentals", value: rented.toLocaleString(), detail: "Marked rented" },
      { label: "Monthly rent", value: formatPrice(monthlyRent), detail: "From rented listings" },
    ];
  }, [properties, requests]);

  const requestGroups = useMemo(
    () =>
      properties.map((property) => ({
        property,
        requests: requests.filter((request) => request.propertyId === property.id),
      })),
    [properties, requests],
  );

  const setField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsPropertyFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;
    if (!form.title.trim() || !form.location.trim() || form.price <= 0 || !form.type) {
      setError("Title, location, a price greater than zero, and property type are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const imageUrls = (form.imageUrls ?? []).map((url) => url.trim()).filter(Boolean);
      const payload = {
        ...form,
        imageUrl: imageUrls[0] ?? form.imageUrl,
        imageUrls,
      };
      if (editingId) {
        await updateProperty(editingId, payload);
      } else {
        await createProperty({ ...payload, ownerId: currentUser.uid });
      }
      resetForm();
      await loadProperties();
    } catch (propertyError) {
      setError(getSavePropertyErrorMessage(propertyError, editingId ? "update" : "create"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingId(property.id);
    setActiveSection("properties");
    setIsPropertyFormOpen(true);
    setForm({
      title: property.title,
      location: property.location,
      address: property.address,
      price: property.price,
      type: property.type,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      description: property.description,
      imageUrl: getPropertyCoverImage(property),
      imageUrls: property.imageUrls?.length ? property.imageUrls : property.imageUrl ? [property.imageUrl] : [],
      status: property.status,
    });
    window.setTimeout(() => {
      document.getElementById("add-property")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleDelete = async (property: Property) => {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteProperty(property.id);
      if (editingId === property.id) resetForm();
      await loadProperties();
    } catch {
      setError("Unable to delete the property. Please try again.");
    }
  };

  const handleRequestStatus = async (
    requestId: string,
    status: Extract<RentalRequestStatus, "approved" | "rejected">,
  ) => {
    setUpdatingRequestId(requestId);
    setRequestsError("");
    try {
      await updateRentalRequestStatus(requestId, status);
      await loadRequests();
    } catch {
      setRequestsError(`Unable to ${status === "approved" ? "approve" : "reject"} the request.`);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const openPaymentModal = (request: RentalRequest) => {
    setPaymentRequest(request);
    setPaymentForm({
      rentDeposit: String(request.propertyPrice),
      utilityDeposit: "",
      monthlyRent: String(request.propertyPrice),
    });
  };

  const handleApproveWithPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentRequest) return;

    const requestToApprove = paymentRequest;
    const rentDeposit = Number(paymentForm.rentDeposit);
    const utilityDeposit = Number(paymentForm.utilityDeposit);
    const monthlyRent = Number(paymentForm.monthlyRent);
    const totalDue = rentDeposit + utilityDeposit + monthlyRent;

    if ([rentDeposit, utilityDeposit, monthlyRent].some((value) => !Number.isFinite(value) || value < 0)) {
      setRequestsError("Please enter valid payment amounts.");
      return;
    }

    setUpdatingRequestId(requestToApprove.id);
    setRequestsError("");
    try {
      await approveRentalRequestWithPayment(requestToApprove.id, {
        rentDeposit,
        utilityDeposit,
        monthlyRent,
      });
      setRequests((items) =>
        items.map((request) =>
          request.id === requestToApprove.id
            ? {
                ...request,
                status: "approved",
                payment: {
                  rentDeposit,
                  utilityDeposit,
                  monthlyRent,
                  totalDue,
                  status: "unpaid",
                },
              }
            : request,
        ),
      );
      setPaymentRequest(null);
      void loadRequests();
    } catch (requestError) {
      setRequestsError(getRequestUpdateErrorMessage(requestError, "approve"));
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";
  const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-300";
  const optionClass = "bg-slate-950 text-white";
  const panelClass = "rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/10";
  const mutedCardClass = "rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400";
  const isAddPropertyOnly = location.hash === "#add-property" && isPropertyFormOpen && !editingId;

  return (
    <main className="mx-auto min-h-[calc(100vh-145px)] max-w-[96rem] px-4 pb-20 pt-8 text-slate-950 dark:text-white sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/20 lg:sticky lg:top-32">
          <div className="rounded-3xl bg-slate-950 p-5 text-white dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Host menu</p>
            <h1 className="mt-3 text-2xl font-black">Host Dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your owner workspace, split into three clean sections.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsPropertyFormOpen(false);
                    setEditingId(null);
                  }}
                  className={`w-full rounded-2xl border px-4 py-5 text-left transition ${
                    isActive
                      ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/15"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-emerald-300/70 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  <p className="font-black">{item.label}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0">
          {activeSection === "overview" && (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20 sm:p-10">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-300">
                    Host workspace
                  </p>
                  <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                    Host Dashboard
                  </h2>
                  <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
                    Manage listings, review tenant requests, and keep your rental activity organized.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("properties")}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
                >
                  Add listing
                </button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <article key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-black">{stat.value}</p>
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{stat.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "properties" && (
            <div className="space-y-8">
              {!isAddPropertyOnly && (
                <section className={`${panelClass} p-6`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black">Your Properties</h2>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">Create, update, and track listing visibility.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {properties.length} listings
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setIsPropertyFormOpen(true);
                          navigate("/owner-dashboard#add-property", { replace: false });
                          window.setTimeout(() => {
                            document.getElementById("add-property")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 50);
                        }}
                        className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-300"
                      >
                        Add Property
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <p className="mt-5 text-slate-600 dark:text-slate-400">Loading properties...</p>
                  ) : properties.length === 0 ? (
                    <p className={`mt-5 ${mutedCardClass}`}>No properties added yet. Use the Add Property button to publish your first listing.</p>
                  ) : (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
                          <colgroup>
                            <col className="w-[34%]" />
                            <col className="w-[12%]" />
                            <col className="w-[12%]" />
                            <col className="w-[9%]" />
                            <col className="w-[13%]" />
                            <col className="w-[20%]" />
                          </colgroup>
                          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/5 dark:text-slate-400">
                            <tr>
                              <th className="px-4 py-4">Property</th>
                              <th className="px-4 py-4">Price</th>
                              <th className="px-4 py-4">Type</th>
                              <th className="px-4 py-4">Rooms</th>
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                            {properties.map((property) => (
                              <tr key={property.id} className="align-middle transition hover:bg-slate-50/70 dark:hover:bg-white/[0.03]">
                                <td className="px-4 py-4">
                                  <div className="flex min-w-0 items-center gap-4">
                                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                                      {getPropertyCoverImage(property) ? (
                                        <img src={getPropertyCoverImage(property)} alt={property.title} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="grid h-full place-items-center text-xs font-bold text-slate-400">No image</div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="truncate text-base font-black text-slate-950 dark:text-white">{property.title}</h3>
                                      <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">{property.location}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-950 dark:text-white">{formatPrice(property.price)}</td>
                                <td className="px-4 py-4 font-bold text-slate-950 dark:text-white">{property.type}</td>
                                <td className="px-4 py-4 font-bold text-slate-950 dark:text-white">{property.rooms}</td>
                                <td className="px-4 py-4"><StatusBadge value={property.status} /></td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-nowrap items-center gap-2">
                                    <Link to={`/properties/${property.id}`} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20">View</Link>
                                    <button type="button" onClick={() => handleEdit(property)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15">Edit</button>
                                    <button type="button" onClick={() => void handleDelete(property)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {isPropertyFormOpen && (
                <section id="add-property" className={`scroll-mt-28 p-6 ${panelClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-black">{editingId ? "Edit Property" : "Add Property"}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Use available for listings tenants can discover, pending while preparing a listing, and rented once occupied.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        navigate("/owner-dashboard", { replace: false });
                        setActiveSection("properties");
                      }}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      Back
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className={labelClass}>Title *<input required value={form.title} onChange={(e) => setField("title", e.target.value)} className={inputClass} /></label>
                    <label className={labelClass}>Location *<input required value={form.location} onChange={(e) => setField("location", e.target.value)} className={inputClass} /></label>
                    <label className={`${labelClass} md:col-span-2`}>Address<input value={form.address} onChange={(e) => setField("address", e.target.value)} className={inputClass} /></label>
                    <label className={labelClass}>Monthly Price (RM) *<input required min="1" type="number" value={form.price || ""} onChange={(e) => setField("price", Number(e.target.value))} className={inputClass} /></label>
                    <label className={labelClass}>Type *<select value={form.type} onChange={(e) => setField("type", e.target.value as FormData["type"])} className={inputClass}>{propertyTypes.map((type) => <option className={optionClass} key={type}>{type}</option>)}</select></label>
                    <label className={labelClass}>Rooms<input min="0" type="number" value={form.rooms} onChange={(e) => setField("rooms", Number(e.target.value))} className={inputClass} /></label>
                    <label className={labelClass}>Bathrooms<input min="0" type="number" value={form.bathrooms} onChange={(e) => setField("bathrooms", Number(e.target.value))} className={inputClass} /></label>
                    <label className={labelClass}>Status<select value={form.status} onChange={(e) => setField("status", e.target.value as FormData["status"])} className={inputClass}>{propertyStatuses.map((status) => <option className={optionClass} key={status}>{status}</option>)}</select></label>
                    <div className={`${labelClass} md:col-span-2`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span>Image URLs</span>
                          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Each image has its own field. First image becomes the cover.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              imageUrls: [...(current.imageUrls?.length ? current.imageUrls : [""]), ""],
                            }))
                          }
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                        >
                          Add Image
                        </button>
                      </div>
                      <div className="mt-3 space-y-3">
                        {(form.imageUrls?.length ? form.imageUrls : [""]).map((imageUrl, index) => (
                          <div key={index} className="flex gap-3">
                            <input
                              type="url"
                              value={imageUrl}
                              placeholder={`Image URL ${index + 1}`}
                              onChange={(event) => {
                                const imageUrls = [...(form.imageUrls?.length ? form.imageUrls : [""])];
                                imageUrls[index] = parseImageUrls(event.target.value);
                                setForm((current) => ({
                                  ...current,
                                  imageUrls,
                                  imageUrl: imageUrls.find(Boolean) ?? "",
                                }));
                              }}
                              className={`${inputClass} mt-0`}
                            />
                            {(form.imageUrls?.length ?? 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const imageUrls = (form.imageUrls ?? []).filter((_, imageIndex) => imageIndex !== index);
                                  setForm((current) => ({
                                    ...current,
                                    imageUrls,
                                    imageUrl: imageUrls.find(Boolean) ?? "",
                                  }));
                                }}
                                className="mt-0 rounded-xl border border-red-200 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <label className={`${labelClass} md:col-span-2`}>Description<textarea rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} className={inputClass} /></label>
                    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200 md:col-span-2">{error}</p>}
                    <div className="flex gap-3 md:col-span-2">
                      <button disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update Property" : "Create Property"}</button>
                      <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button>
                    </div>
                  </form>
                </section>
              )}
            </div>
          )}

          {activeSection === "requests" && (
            <section className={`${panelClass} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Rental Requests</h2>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">Review tenant applications.</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                  {requests.length} request{requests.length === 1 ? "" : "s"} · {requests.filter((request) => request.status === "pending").length} pending
                </span>
              </div>

              {requestsLoading ? (
                <p className="mt-5 text-slate-600 dark:text-slate-400">Loading rental requests...</p>
              ) : requestsError ? (
                <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">{requestsError}</p>
              ) : properties.length === 0 ? (
                <p className={`mt-5 ${mutedCardClass}`}>Add a property first. Rental requests will be grouped by each property here.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {requestGroups.map(({ property, requests: propertyRequests }) => {
                    const pendingCount = propertyRequests.filter((request) => request.status === "pending").length;

                    return (
                      <article key={property.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                          <div>
                            <h3 className="font-black">{property.title}</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {property.location} - {formatPrice(property.price)} / month
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                            {propertyRequests.length} request{propertyRequests.length === 1 ? "" : "s"} · {pendingCount} pending
                          </span>
                        </div>

                        {propertyRequests.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No requests for this property yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-[1080px] table-fixed divide-y divide-slate-200 text-sm dark:divide-white/10 xl:min-w-full">
                              <thead className="bg-white dark:bg-slate-900/40">
                                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                  <th className="w-[190px] px-4 py-3">Tenant</th>
                                  <th className="w-[420px] px-4 py-3">Message</th>
                                  <th className="w-[140px] px-4 py-3">Status</th>
                                  <th className="w-[190px] px-4 py-3">Action</th>
                                  <th className="w-[130px] px-4 py-3">Chat</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                {propertyRequests.map((request) => (
                                  <tr key={request.id}>
                                    <td className="px-4 py-4 align-top">
                                      <p className="font-bold text-slate-950 dark:text-white">{request.tenantName}</p>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{request.tenantEmail}</p>
                                    </td>
                                    <td className="px-4 py-4 align-top text-slate-600 dark:text-slate-300">
                                      <p className="truncate" title={request.message || "No message provided."}>
                                        {request.message || "No message provided."}
                                      </p>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                      <StatusBadge value={request.status} />
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                      {request.status === "pending" ? (
                                        <div className="flex flex-nowrap items-center gap-2">
                                          <button disabled={updatingRequestId === request.id} type="button" onClick={() => openPaymentModal(request)} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                                          <button disabled={updatingRequestId === request.id} type="button" onClick={() => void handleRequestStatus(request.id, "rejected")} className="whitespace-nowrap rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20">Reject</button>
                                        </div>
                                      ) : (
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Done</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                      <Link to={`/chat?conversation=${getConversationId(request.propertyId, request.tenantId, request.ownerId)}`} className="inline-flex whitespace-nowrap rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20">View Chat</Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {paymentRequest && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-300">Payment setup</p>
                <h2 className="mt-3 text-2xl font-black">Approve rental request</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Set the payment amount for {paymentRequest.tenantName}. The tenant will see this after approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentRequest(null)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleApproveWithPayment} className="mt-6 space-y-4">
              <label className={labelClass}>
                Rental deposit
                <input
                  type="number"
                  min="0"
                  value={paymentForm.rentDeposit}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, rentDeposit: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Utility deposit
                <input
                  type="number"
                  min="0"
                  value={paymentForm.utilityDeposit}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, utilityDeposit: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Monthly rent
                <input
                  type="number"
                  min="0"
                  value={paymentForm.monthlyRent}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, monthlyRent: event.target.value }))}
                  className={inputClass}
                />
              </label>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-slate-200">
                Total due: {formatPrice((Number(paymentForm.rentDeposit) || 0) + (Number(paymentForm.utilityDeposit) || 0) + (Number(paymentForm.monthlyRent) || 0))}
              </div>

              <button
                type="submit"
                disabled={updatingRequestId === paymentRequest.id}
                className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {updatingRequestId === paymentRequest.id ? "Approving..." : "Approve and send payment"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
