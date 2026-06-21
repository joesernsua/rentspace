import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiAward, FiCalendar, FiFlag, FiHeart, FiHome, FiMapPin, FiMessageCircle, FiShare2, FiUserCheck } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { startPropertyConversation } from "../services/chatService";
import { isFavouriteProperty, toggleFavouriteProperty } from "../services/favouriteService";
import { getPropertyById } from "../services/propertyService";
import { createReportedIssue } from "../services/reportedIssueService";
import {
  createRentalRequest,
  getTenantRentalRequests,
} from "../services/rentalRequestService";
import type { Property } from "../types/Property";

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

function getRating(property: Property) {
  const seed = `${property.id}${property.title}`;
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (4.78 + (total % 19) / 100).toFixed(2);
}

function getReviewCount(property: Property) {
  const seed = `${property.id}${property.location}`;
  return 24 + (seed.length % 38);
}

function getGalleryImages(property: Property) {
  const fallback = "/care.jpg";
  const images = property.imageUrls?.filter(Boolean) ?? [];
  const primary = images[0] || property.imageUrl || fallback;
  const gallery = images.length > 0 ? images : [primary];

  return Array.from({ length: 5 }, (_, index) => gallery[index] ?? primary);
}

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [contractYears, setContractYears] = useState(1);
  const [requestMessage, setRequestMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Invalid property link.");
      setLoading(false);
      return;
    }
    getPropertyById(id)
      .then((loadedProperty) => {
        setProperty(loadedProperty);
        if (loadedProperty) setIsFavourite(isFavouriteProperty(loadedProperty.id));
      })
      .catch(() =>
        setError("Unable to load this property. It may no longer be available."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const galleryImages = useMemo(
    () => (property ? getGalleryImages(property) : []),
    [property],
  );

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!property || !currentUser || userProfile?.role !== "tenant") return;

    setSubmitting(true);
    setRequestMessage("");
    try {
      const trimmedMessage = message.trim() || `Hi, I am interested in ${property.title}.`;
      const requests = await getTenantRentalRequests(currentUser.uid);
      const duplicate = requests.find(
        (request) =>
          request.propertyId === property.id,
      );
      if (duplicate) {
        const conversationId = await startPropertyConversation({
          ownerId: property.ownerId,
          ownerName: "Property owner",
          tenantId: currentUser.uid,
          tenantName: userProfile.name,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyLocation: property.location,
          propertyPrice: property.price,
          propertyType: property.type,
          propertyRooms: property.rooms,
          propertyBathrooms: property.bathrooms,
          propertyImageUrl: property.imageUrls?.[0] || property.imageUrl || "",
          message: trimmedMessage,
          senderId: currentUser.uid,
          senderName: userProfile.name,
        });
        navigate(`/chat?conversation=${conversationId}`);
        return;
      }

      await createRentalRequest({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyPrice: property.price,
        propertyImageUrl: property.imageUrls?.[0] || property.imageUrl || "",
        ownerId: property.ownerId,
        tenantId: currentUser.uid,
        tenantName: userProfile.name,
        tenantEmail: userProfile.email,
        contractYears,
        message: trimmedMessage,
      });
      const conversationId = await startPropertyConversation({
        ownerId: property.ownerId,
        ownerName: "Property owner",
        tenantId: currentUser.uid,
        tenantName: userProfile.name,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyPrice: property.price,
        propertyType: property.type,
        propertyRooms: property.rooms,
        propertyBathrooms: property.bathrooms,
        propertyImageUrl: property.imageUrls?.[0] || property.imageUrl || "",
        message: trimmedMessage,
        senderId: currentUser.uid,
        senderName: userProfile.name,
      });
      setMessage("");
      setRequestMessage("Your rental request was submitted successfully.");
      navigate(`/chat?conversation=${conversationId}`);
    } catch {
      setRequestMessage("Unable to submit your rental request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!property || !currentUser || userProfile?.role !== "tenant") return;

    setStartingChat(true);
    setRequestMessage("");
    try {
      const trimmedMessage = message.trim() || `Hi, I am interested in ${property.title}.`;
      const conversationId = await startPropertyConversation({
        ownerId: property.ownerId,
        ownerName: "Property owner",
        tenantId: currentUser.uid,
        tenantName: userProfile.name,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyPrice: property.price,
        propertyType: property.type,
        propertyRooms: property.rooms,
        propertyBathrooms: property.bathrooms,
        propertyImageUrl: property.imageUrls?.[0] || property.imageUrl || "",
        message: trimmedMessage,
        senderId: currentUser.uid,
        senderName: userProfile.name,
      });

      navigate(`/chat?conversation=${conversationId}`);
    } catch {
      setRequestMessage("Unable to open chat. Please try again.");
    } finally {
      setStartingChat(false);
    }
  };

  const handleReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!property || !currentUser || userProfile?.role !== "tenant") return;
    if (!reportReason || !reportDetails.trim()) {
      setReportMessage("Please select a reason and describe the issue.");
      return;
    }

    setSubmittingReport(true);
    setReportMessage("");
    try {
      const ticketId = await createReportedIssue({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyOwnerId: property.ownerId,
        tenantId: currentUser.uid,
        tenantName: userProfile.name,
        tenantEmail: userProfile.email,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setReportReason("");
      setReportDetails("");
      setIsReportOpen(false);
      setReportMessage(`Report submitted. Ticket ID: ${ticketId}`);
    } catch {
      setReportMessage("Unable to submit the report. Please try again.");
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-[calc(100vh-145px)] max-w-7xl px-6 py-16 text-slate-950 dark:text-white">
        <p className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">Loading property details...</p>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="mx-auto min-h-[calc(100vh-145px)] max-w-7xl px-6 py-16 text-slate-950 dark:text-white">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-slate-900">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-300">Property Details</p>
          <h1 className="mt-4 text-4xl font-black">{error ? "Unable to load property" : "Property not found"}</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">{error || "This property could not be found or is no longer available."}</p>
          <Link to="/properties.php" className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-500">
            Back to properties
          </Link>
        </section>
      </main>
    );
  }

  const rating = getRating(property);
  const reviews = getReviewCount(property);

  return (
    <main className="mx-auto min-h-[calc(100vh-145px)] max-w-7xl px-4 pb-20 pt-8 text-slate-950 dark:text-white sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/properties.php" className="text-sm font-bold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
              ← Back to properties
            </Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {property.title}
            </h1>
          </div>
          <div className="flex gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <FiShare2 /> Share
            </button>
            <button
              type="button"
              onClick={() => setIsFavourite(toggleFavouriteProperty(property))}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition ${
                isFavourite
                  ? "border-pink-200 bg-pink-100 text-pink-600 hover:bg-pink-200 dark:border-pink-300/40 dark:bg-pink-300/20 dark:text-pink-200"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              }`}
            >
              <FiHeart className={isFavourite ? "fill-current" : ""} /> Favourite
            </button>
          </div>
        </div>

        <div className="grid h-[420px] gap-2 overflow-hidden rounded-3xl md:grid-cols-2">
          <div className="relative h-full bg-slate-800">
            <img src={galleryImages[0]} alt={property.title} className="h-full w-full object-cover" />
          </div>
          <div className="hidden grid-cols-2 gap-2 md:grid">
            {galleryImages.slice(1).map((image, index) => (
              <div key={`${image}-${index}`} className="relative bg-slate-800">
                <img src={image} alt={`${property.title} view ${index + 2}`} className="h-full w-full object-cover" />
                {index === 3 && (
                  <button
                    type="button"
                    onClick={() => setIsPhotoViewerOpen(true)}
                    className="absolute bottom-5 right-5 rounded-xl border border-white/20 bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-xl transition hover:bg-slate-100"
                  >
                    Show all photos
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <section className="border-b border-slate-200 pb-8 dark:border-white/10">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Entire rental {property.type.toLowerCase()} in {property.location}
              </h2>
              <p className="mt-2 text-lg text-slate-700 dark:text-slate-300">
                {property.rooms} room{property.rooms === 1 ? "" : "s"} · {property.bathrooms} bath{property.bathrooms === 1 ? "" : "s"} · {property.type}
              </p>

              <div className="mt-8 grid items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/10 sm:grid-cols-[1fr_auto_auto]">
                <div className="flex items-center gap-4">
                  <FiAward className="text-4xl text-emerald-300" />
                  <div>
                    <p className="text-xl font-black text-slate-950 dark:text-white">Guest favorite</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">One of the most loved homes according to guests.</p>
                  </div>
                </div>
                <div className="border-slate-200 dark:border-white/10 sm:border-l sm:px-6">
                  <p className="text-2xl font-black">{rating}</p>
                  <p className="text-xs text-emerald-300">★★★★★</p>
                </div>
                <div className="border-slate-200 dark:border-white/10 sm:border-l sm:pl-6">
                  <p className="text-2xl font-black">{reviews}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Reviews</p>
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 py-8 dark:border-white/10">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-500 text-sm font-black text-slate-950">
                  RS
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">Hosted by RentSpace Owner</h3>
                  <p className="text-slate-600 dark:text-slate-400">Verified owner · Rental listing</p>
                </div>
              </div>
            </section>

            <section className="space-y-7 border-b border-slate-200 py-8 dark:border-white/10">
              {[
                [FiHome, "Move-in ready", "This listing is ready for tenants to review and request."],
                [FiUserCheck, "Self introduction accepted", "Send the owner your rental needs before they approve."],
                [FiMapPin, "Great location", property.address || `Located in ${property.location}.`],
              ].map(([Icon, title, description]) => {
                const FeatureIcon = Icon as typeof FiHome;
                return (
                  <div key={title as string} className="flex gap-5">
                    <FeatureIcon className="mt-1 text-2xl text-slate-700 dark:text-slate-300" />
                    <div>
                      <h3 className="font-black text-slate-950 dark:text-white">{title as string}</h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">{description as string}</p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="py-8">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">About this property</h2>
              <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-slate-700 dark:text-slate-300">
                {property.description || "No description provided."}
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30">
              <div className="mb-5 rounded-2xl bg-slate-50 px-5 py-4 text-center font-bold text-slate-700 dark:bg-white/5 dark:text-slate-200">
                Prices include all fees
              </div>

              <p className="text-3xl font-black text-slate-950 dark:text-white">
                {formatPrice(property.price)} <span className="text-base font-medium text-slate-600 dark:text-slate-400">/ month</span>
              </p>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-300 dark:border-white/15">
                <div className="grid grid-cols-2 border-b border-slate-300 dark:border-white/15">
                  <div className="p-4">
                    <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Move-in</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">Flexible</p>
                  </div>
                  <div className="border-l border-slate-300 p-4 dark:border-white/15">
                    <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Status</p>
                    <p className="mt-1 font-semibold capitalize text-slate-950 dark:text-white">{property.status}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Estimated Capacity</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">{Math.max(property.rooms, 1)} tenant{property.rooms === 1 ? "" : "s"}</p>
                </div>
              </div>

              {authLoading ? (
                <p className="mt-5 text-slate-600 dark:text-slate-400">Checking your account...</p>
              ) : !currentUser || !userProfile ? (
                <div className="mt-5">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Please login as a tenant to submit a rental request.</p>
                  <Link to="/login.html" className="mt-4 flex justify-center rounded-2xl bg-indigo-600 px-5 py-4 font-black text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500">
                    Login to request
                  </Link>
                </div>
              ) : userProfile.role !== "tenant" ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">Only tenants can apply for rentals.</p>
              ) : (
                <form onSubmit={handleRequest} className="mt-5">
                  <label className="mb-4 block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Contract length
                    <select
                      value={contractYears}
                      onChange={(event) => setContractYears(Number(event.target.value))}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                    >
                      {[1, 2, 3, 4, 5].map((years) => (
                        <option key={years} value={years} className="bg-slate-950 text-white">
                          {years} year{years === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Message to owner
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Tell the owner a little about your rental needs."
                      className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </label>
                  {requestMessage && (
                    <p role="status" className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
                      {requestMessage}
                    </p>
                  )}
                  <button disabled={submitting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-4 font-black text-white shadow-lg shadow-rose-600/20 hover:from-pink-400 hover:to-rose-500 disabled:opacity-60">
                    <FiCalendar />
                    {submitting ? "Submitting..." : "Reserve"}
                  </button>
                  <button
                    type="button"
                    disabled={startingChat}
                    onClick={handleStartChat}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-4 font-black text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    <FiMessageCircle />
                    {startingChat ? "Opening chat..." : "Chat"}
                  </button>
                  <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">You will not be charged yet</p>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentUser || userProfile?.role !== "tenant") {
                  navigate("/login.html");
                  return;
                }
                setIsReportOpen((open) => !open);
              }}
              className="mx-auto mt-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              <FiFlag /> Report this listing
            </button>
            {reportMessage && (
              <p role="status" className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {reportMessage}
              </p>
            )}
            {isReportOpen && (
              <form onSubmit={handleReport} className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Reason
                  <select
                    required
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                  >
                    <option value="" className="bg-slate-950 text-white">Select a reason</option>
                    {["Fake listing", "Wrong property details", "Suspicious owner behavior", "Property unavailable", "Payment or deposit concern", "Other"].map((reason) => (
                      <option key={reason} value={reason} className="bg-slate-950 text-white">{reason}</option>
                    ))}
                  </select>
                </label>
                <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Details
                  <textarea
                    required
                    rows={4}
                    value={reportDetails}
                    onChange={(event) => setReportDetails(event.target.value)}
                    placeholder="Explain what happened so admin can review it."
                    className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
                  />
                </label>
                <button
                  disabled={submittingReport}
                  className="mt-4 w-full rounded-2xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-500 disabled:opacity-60"
                >
                  {submittingReport ? "Submitting..." : "Submit report"}
                </button>
              </form>
            )}
          </aside>
        </div>
      </section>

      {isPhotoViewerOpen && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/95 px-4 py-6 text-white backdrop-blur-sm sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="sticky top-0 z-10 mb-6 flex items-center justify-between gap-4 bg-slate-950/95 py-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">Photos</p>
                <h2 className="mt-2 text-3xl font-black">{property.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoViewerOpen(false)}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-slate-950"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {galleryImages.map((image, index) => (
                <figure key={`${image}-viewer-${index}`} className={index === 0 ? "md:col-span-2" : ""}>
                  <img
                    src={image}
                    alt={`${property.title} photo ${index + 1}`}
                    className="max-h-[720px] w-full rounded-3xl object-cover"
                  />
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
