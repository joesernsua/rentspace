import { useEffect, useState } from "react";
import { Link } from "react-router";
import StatusBadge from "./StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getPropertyById } from "../services/propertyService";
import { getTenantRentalRequests } from "../services/rentalRequestService";
import type { RentalRequest } from "../types/RentalRequest";

type PayableRequest = RentalRequest & {
  payment: NonNullable<RentalRequest["payment"]>;
};

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

function getErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "permission-denied") {
    return "Permission denied. Please publish the updated Firestore rules so tenants can read their rental requests.";
  }
  return "Unable to load your rental requests.";
}

async function addPropertyImageUrls(requests: RentalRequest[]) {
  return Promise.all(
    requests.map(async (request) => {
      if (request.propertyImageUrl) return request;

      try {
        const property = await getPropertyById(request.propertyId);
        return {
          ...request,
          propertyImageUrl: property?.imageUrls?.[0] || property?.imageUrl || "",
        };
      } catch {
        return request;
      }
    }),
  );
}

function CheckoutOverlay({
  request,
  onClose,
}: {
  request: PayableRequest;
  onClose: () => void;
}) {
  const propertyImageUrl = request.propertyImageUrl || "/care.jpg";

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white px-5 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-5">
          <button
            type="button"
            aria-label="Back to requests"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-xl font-bold text-slate-700 transition hover:bg-slate-200"
          >
            &larr;
          </button>
          <h2 className="text-3xl font-black">Confirm and pay</h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.9fr]">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
            <h3 className="text-xl font-black">1. Add a payment method</h3>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-8 w-8 place-items-center rounded bg-slate-900 text-[10px] font-black text-white">
                  CARD
                </span>
                <div>
                  <p className="font-semibold">Credit or debit card</p>
                  <p className="text-xs font-bold text-slate-500">VISA / Mastercard / AMEX</p>
                </div>
              </div>
              <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-slate-950">
                <span className="h-3 w-3 rounded-full bg-slate-950" />
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-400">
              <input
                aria-label="Card number"
                placeholder="Card number"
                autoComplete="off"
                inputMode="numeric"
                className="w-full border-b border-slate-300 px-4 py-4 outline-none"
              />
              <div className="grid grid-cols-2">
                <input
                  aria-label="Expiration"
                  placeholder="Expiration"
                  autoComplete="off"
                  inputMode="numeric"
                  className="border-r border-slate-300 px-4 py-4 outline-none"
                />
                <input
                  aria-label="CVV"
                  placeholder="CVV"
                  autoComplete="off"
                  inputMode="numeric"
                  className="px-4 py-4 outline-none"
                />
              </div>
            </div>

            <input
              aria-label="ZIP code"
              placeholder="ZIP code"
              autoComplete="off"
              className="mt-4 w-full rounded-xl border border-slate-400 px-4 py-4 outline-none"
            />

            <button
              type="button"
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-400 px-4 py-3 text-left"
            >
              <span>
                <span className="block text-xs text-slate-500">Country/region</span>
                <span className="font-semibold">Malaysia</span>
              </span>
              <span className="text-xl">v</span>
            </button>

            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {["Google Pay", "FPX"].map((method) => (
                <label key={method} className="flex cursor-pointer items-center justify-between py-5">
                  <span className="font-semibold">{method}</span>
                  <input type="radio" name="payment-method" className="h-5 w-5" />
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-xl bg-slate-950 px-10 py-4 font-black text-white transition hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </section>

          <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex gap-4">
              <img
                src={propertyImageUrl}
                alt={request.propertyTitle}
                className="h-24 w-28 shrink-0 rounded-xl object-cover"
              />
              <div>
                <h3 className="text-xl font-black leading-tight">{request.propertyTitle}</h3>
                <p className="mt-2 text-sm text-slate-600">{request.propertyLocation}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h4 className="font-black">Price details</h4>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Rental deposit</dt>
                  <dd className="font-semibold">{formatPrice(request.payment.rentDeposit)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Utility deposit</dt>
                  <dd className="font-semibold">{formatPrice(request.payment.utilityDeposit)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Monthly rent</dt>
                  <dd className="font-semibold">{formatPrice(request.payment.monthlyRent)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-4 text-base">
                  <dt className="font-black">Total MYR</dt>
                  <dd className="font-black">{formatPrice(request.payment.totalDue)}</dd>
                </div>
              </dl>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Your request will stay accepted while payment is being processed.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function TenantRequestStatusPanel() {
  const { currentUser, userProfile } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(Boolean(currentUser));
  const [error, setError] = useState("");
  const [checkoutRequest, setCheckoutRequest] = useState<PayableRequest | null>(null);

  useEffect(() => {
    if (!currentUser || !userProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    getTenantRentalRequests(currentUser.uid)
      .then(addPropertyImageUrls)
      .then((items) => {
        setRequests(
          items.sort(
            (first, second) =>
              (second.createdAt?.toMillis() ?? 0) -
              (first.createdAt?.toMillis() ?? 0),
          ),
        );
      })
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [currentUser, userProfile]);

  if (!currentUser || !userProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <p>Login as a tenant to view your rental request status.</p>
        <Link to="/login.html" className="mt-3 inline-block font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-white">
          Login to dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading rental requests...</p>;
  }

  if (error) {
    return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-6 text-slate-600 dark:bg-white/5 dark:text-slate-400">
        <p>You have not submitted any rental requests yet.</p>
        <Link to="/properties.php" className="mt-3 inline-block font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-white">
          Browse available properties
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="overflow-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200 text-left dark:divide-white/10">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="w-[20%] px-4 py-4">Property</th>
                <th className="w-[17%] px-4 py-4">Location</th>
                <th className="w-[12%] px-4 py-4">Rent</th>
                <th className="w-[11%] px-4 py-4">Status</th>
                <th className="w-[18%] px-4 py-4">Payment</th>
                <th className="w-[10%] px-4 py-4">Date</th>
                <th className="w-[12%] px-4 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-white/10 dark:bg-slate-900">
              {requests.map((request) => (
                <tr key={request.id} className="align-top">
                  <td className="px-4 py-4 font-bold leading-6 text-slate-950 dark:text-white">
                    {request.propertyTitle}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {request.propertyLocation}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatPrice(request.propertyPrice)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge value={request.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {request.status === "approved" && request.payment ? (
                      <div>
                        <p className="font-black text-slate-950 dark:text-white">{formatPrice(request.payment.totalDue)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Deposit {formatPrice(request.payment.rentDeposit)} / Utility {formatPrice(request.payment.utilityDeposit)}
                        </p>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {request.createdAt ? request.createdAt.toDate().toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-4">
                    {request.status === "approved" && request.payment && (
                      <button
                        type="button"
                        onClick={() => setCheckoutRequest(request as PayableRequest)}
                        className="whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                      >
                        Make payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {checkoutRequest && (
        <CheckoutOverlay
          request={checkoutRequest}
          onClose={() => setCheckoutRequest(null)}
        />
      )}
    </>
  );
}
