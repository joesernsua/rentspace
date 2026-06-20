import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { FiCheckCircle } from "react-icons/fi";
import { Link } from "react-router";
import StatusBadge from "./StatusBadge";
import { useAuth } from "../context/AuthContext";
import { createPaymentHistory } from "../services/paymentHistoryService";
import { getPropertyById } from "../services/propertyService";
import { saveUserPaymentMethod } from "../services/paymentMethodService";
import { getTenantRentalRequests, markRentalRequestPaymentPaid } from "../services/rentalRequestService";
import type { RentalRequest } from "../types/RentalRequest";
import { getPaidRequestIds, savePaidRequestId } from "../utils/rentalPayments";

export type PayableRequest = RentalRequest & {
  payment: NonNullable<RentalRequest["payment"]>;
};

type PaymentMethod = "saved-card" | "card" | "google-pay" | "fpx";
type PaymentStatus = "idle" | "loading" | "success";
type SavedPaymentMethod = {
  type: "card";
  last4: string;
  expiration: string;
  zipCode: string;
};
type CheckoutPaymentDetails = {
  rentDeposit: number;
  utilityDeposit: number;
  monthlyRent: number;
  totalPaid: number;
  billingPeriod: "initial" | "monthly";
  lineItems?: Array<{
    label: string;
    monthNumber: number;
    type: "rent" | "utilities";
    amount: number;
  }>;
  priceRows?: Array<{
    label: string;
    value: number | string;
  }>;
};

const paymentMethodTransition: Transition = { duration: 0.24, ease: "easeOut" };
const paymentMethodStorageKey = "rentspace-payment-method";
const mastercardLogoSrc = "/mastercard-logo.jpg";

function getSavedPaymentMethod(): SavedPaymentMethod | null {
  if (typeof window === "undefined") return null;

  try {
    const method = JSON.parse(window.localStorage.getItem(paymentMethodStorageKey) || "null");
    if (
      method?.type === "card" &&
      typeof method.last4 === "string" &&
      typeof method.expiration === "string" &&
      typeof method.zipCode === "string"
    ) {
      return method;
    }
  } catch {
    return null;
  }

  return null;
}

function savePaymentMethod(method: SavedPaymentMethod) {
  window.localStorage.setItem(paymentMethodStorageKey, JSON.stringify(method));
}

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

function formatContractYears(years = 1) {
  return `${years} year${years === 1 ? "" : "s"}`;
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiration(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 4)
    .replace(/(\d{2})(?=\d)/, "$1/");
}

function formatCvv(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
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

export function CheckoutOverlay({
  request,
  userId,
  onClose,
  onPaymentSuccess,
  paymentDetails,
  markRequestPaid = true,
  successBackLabel = "Back to home",
  successBackTo = "/",
}: {
  request: PayableRequest;
  userId: string;
  onClose: () => void;
  onPaymentSuccess: (requestId: string) => void;
  paymentDetails?: CheckoutPaymentDetails;
  markRequestPaid?: boolean;
  successBackLabel?: string;
  successBackTo?: string;
}) {
  const propertyImageUrl = request.propertyImageUrl || "/care.jpg";
  const checkoutDetails = paymentDetails ?? {
    rentDeposit: request.payment.rentDeposit,
    utilityDeposit: request.payment.utilityDeposit,
    monthlyRent: request.payment.monthlyRent,
    totalPaid: request.payment.totalDue,
    billingPeriod: "initial" as const,
  };
  const [savedPaymentMethod, setSavedPaymentMethod] = useState<SavedPaymentMethod | null>(() => getSavedPaymentMethod());
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    savedPaymentMethod ? "saved-card" : "card",
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const isCardSelected = paymentMethod === "card";
  const isProcessingPayment = paymentStatus === "loading";

  const handlePaymentSubmit = () => {
    if (isProcessingPayment) return;

    setPaymentStatus("loading");
    window.setTimeout(async () => {
      const paymentRecord =
        paymentMethod === "card"
          ? {
              userId,
              type: "card" as const,
              cardLast4: cardNumber.replace(/\D/g, "").slice(-4),
              expiration,
              zipCode,
            }
          : {
              userId,
              type: paymentMethod === "saved-card" ? "card" as const : paymentMethod,
              ...(savedPaymentMethod
                ? {
                    cardLast4: savedPaymentMethod.last4,
                    expiration: savedPaymentMethod.expiration,
                    zipCode: savedPaymentMethod.zipCode,
                  }
                : {}),
            };

      if (paymentMethod === "card") {
        const digits = cardNumber.replace(/\D/g, "");
        if (digits.length >= 4) {
          const method = {
            type: "card" as const,
            last4: digits.slice(-4),
            expiration,
            zipCode,
          };
          savePaymentMethod(method);
          setSavedPaymentMethod(method);
        }
      }

      try {
        await saveUserPaymentMethod(paymentRecord);
      } catch (saveError) {
        console.error("Unable to save payment method:", saveError);
      }

      try {
        await createPaymentHistory({
          requestId: request.id,
          propertyId: request.propertyId,
          propertyTitle: request.propertyTitle,
          propertyLocation: request.propertyLocation,
          ownerId: request.ownerId,
          tenantId: request.tenantId,
          tenantName: request.tenantName,
          tenantEmail: request.tenantEmail,
          contractYears: request.contractYears,
          paymentMethodType: paymentRecord.type,
          cardLast4: "cardLast4" in paymentRecord ? paymentRecord.cardLast4 : undefined,
          rentDeposit: checkoutDetails.rentDeposit,
          utilityDeposit: checkoutDetails.utilityDeposit,
          monthlyRent: checkoutDetails.monthlyRent,
          totalPaid: checkoutDetails.totalPaid,
          billingPeriod: checkoutDetails.billingPeriod,
          lineItems: checkoutDetails.lineItems,
          status: "paid",
        });
      } catch (historyError) {
        console.error("Unable to create payment history:", historyError);
      }

      if (markRequestPaid) {
        try {
          await markRentalRequestPaymentPaid(request.id);
        } catch (paymentError) {
          console.error("Unable to update payment status:", paymentError);
        }
      }

      setPaymentStatus("success");
    }, 1200);
  };

  const handleBackToHome = () => {
    onPaymentSuccess(request.id);
  };

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
            <AnimatePresence mode="wait">
              {paymentStatus === "success" ? (
                <motion.div
                  key="payment-success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={paymentMethodTransition}
                  className="grid min-h-[420px] place-items-center text-center"
                >
                  <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-4xl text-emerald-700">
                      <FiCheckCircle aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-3xl font-black">Payment successful</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Your payment has been processed successfully.
                    </p>
                    <Link
                      to={successBackTo}
                      onClick={handleBackToHome}
                      className="mt-8 inline-flex rounded-xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      {successBackLabel}
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="payment-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={paymentMethodTransition}
                >
                  <h3 className="text-xl font-black">1. Add a payment method</h3>

            {savedPaymentMethod && (
              <motion.label
                layout
                transition={paymentMethodTransition}
                className="mt-6 flex min-h-16 cursor-pointer items-center justify-between gap-4 border-y border-slate-200 px-4 py-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={mastercardLogoSrc}
                    alt="Mastercard"
                    className="h-10 w-16 rounded-md border border-white/70 bg-white object-contain p-1"
                  />
                  <div>
                    <p className="font-semibold">Saved card ending {savedPaymentMethod.last4}</p>
                    <p className="text-xs font-bold text-slate-500">
                      Expires {savedPaymentMethod.expiration}
                      {savedPaymentMethod.zipCode ? ` - ZIP ${savedPaymentMethod.zipCode}` : ""}
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment-method"
                  checked={paymentMethod === "saved-card"}
                  onChange={() => setPaymentMethod("saved-card")}
                  className="h-5 w-5"
                />
              </motion.label>
            )}

            <motion.label
              layout
              transition={paymentMethodTransition}
              className={`${savedPaymentMethod ? "" : "mt-8"} flex min-h-16 cursor-pointer items-center justify-between gap-4 border-b border-slate-200 px-4 py-4`}
            >
              <div className="flex items-center gap-4">
                <img
                  src={mastercardLogoSrc}
                  alt="Mastercard"
                  className="h-10 w-16 rounded-md border border-slate-200 bg-white object-contain p-1"
                />
                <div>
                  <p className="font-semibold">New credit or debit card</p>
                  <p className="text-xs font-bold text-slate-500">VISA / Mastercard / AMEX</p>
                </div>
              </div>
              <input
                type="radio"
                name="payment-method"
                checked={isCardSelected}
                onChange={() => setPaymentMethod("card")}
                className="h-5 w-5"
              />
            </motion.label>

            <AnimatePresence initial={false}>
              {isCardSelected && (
                <motion.div
                  key="card-details"
                  initial={{ height: 0, opacity: 0, y: -8 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -8 }}
                  transition={paymentMethodTransition}
                  className="overflow-hidden"
                >
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-400">
                    <input
                      aria-label="Card number"
                      placeholder="Card number"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                      className="w-full border-b border-slate-300 px-4 py-4 outline-none"
                    />
                    <div className="grid grid-cols-2">
                      <input
                        aria-label="Expiration"
                        placeholder="Expiration"
                        autoComplete="off"
                        inputMode="numeric"
                        maxLength={5}
                        value={expiration}
                        onChange={(event) => setExpiration(formatExpiration(event.target.value))}
                        className="border-r border-slate-300 px-4 py-4 outline-none"
                      />
                      <input
                        aria-label="CVV"
                        placeholder="CVV"
                        type="password"
                        autoComplete="off"
                        inputMode="numeric"
                        maxLength={3}
                        value={cvv}
                        onChange={(event) => setCvv(formatCvv(event.target.value))}
                        className="px-4 py-4 outline-none"
                      />
                    </div>
                  </div>

                  <input
                    aria-label="ZIP code"
                    placeholder="ZIP code"
                    autoComplete="off"
                    value={zipCode}
                    onChange={(event) => setZipCode(event.target.value)}
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
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              transition={paymentMethodTransition}
              className="mt-6 divide-y divide-slate-200 border-y border-slate-200"
            >
              {[
                { label: "Google Pay", value: "google-pay" },
                { label: "FPX", value: "fpx" },
              ].map((method) => (
                <motion.label
                  layout
                  transition={paymentMethodTransition}
                  key={method.value}
                  className="flex cursor-pointer items-center justify-between px-4 py-5"
                >
                  <span className="font-semibold">{method.label}</span>
                  <input
                    type="radio"
                    name="payment-method"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value as PaymentMethod)}
                    className="h-5 w-5"
                  />
                </motion.label>
              ))}
            </motion.div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handlePaymentSubmit}
                className="rounded-xl bg-slate-950 px-10 py-4 font-black text-white transition hover:bg-slate-800"
              >
                {isProcessingPayment ? (
                  <span className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Loading
                  </span>
                ) : (
                  "Next"
                )}
              </button>
            </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                  <dt>Contract length</dt>
                  <dd className="font-semibold">{formatContractYears(request.contractYears)}</dd>
                </div>
                {(checkoutDetails.priceRows ?? [
                  { label: "Rental deposit", value: checkoutDetails.rentDeposit },
                  { label: "Utility deposit", value: checkoutDetails.utilityDeposit },
                  { label: "First month rent", value: checkoutDetails.monthlyRent },
                ]).map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt>{row.label}</dt>
                    <dd className="font-semibold">
                      {typeof row.value === "number" ? formatPrice(row.value) : row.value}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-4 text-base">
                  <dt className="font-black">Total MYR</dt>
                  <dd className="font-black">{formatPrice(checkoutDetails.totalPaid)}</dd>
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

  const handlePaymentSuccess = (requestId: string) => {
    savePaidRequestId(requestId);
    setRequests((items) => items.filter((request) => request.id !== requestId));
  };

  const checkoutOverlay = checkoutRequest ? (
    <CheckoutOverlay
      request={checkoutRequest}
      userId={currentUser!.uid}
      onClose={() => setCheckoutRequest(null)}
      onPaymentSuccess={handlePaymentSuccess}
    />
  ) : null;

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
        const paidRequestIds = getPaidRequestIds();
        setRequests(
          items
            .filter((request) => request.payment?.status !== "paid" && !paidRequestIds.has(request.id))
            .sort(
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
      <>
        <div className="rounded-2xl bg-slate-50 p-6 text-slate-600 dark:bg-white/5 dark:text-slate-400">
          <p>You have not submitted any rental requests yet.</p>
          <Link to="/properties.php" className="mt-3 inline-block font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-white">
            Browse available properties
          </Link>
        </div>
        {checkoutOverlay}
      </>
    );
  }

  const requestSummary = [
    { label: "Total requests", value: requests.length },
    { label: "Accepted", value: requests.filter((request) => request.status === "approved").length },
    { label: "Pending", value: requests.filter((request) => request.status === "pending").length },
    { label: "Rejected", value: requests.filter((request) => request.status === "rejected").length },
  ];

  return (
    <>
      <div className="mb-6 grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white sm:grid-cols-2 lg:grid-cols-4">
        {requestSummary.map((item) => (
          <div key={item.label} className="border-b border-slate-200 p-5 last:border-b-0 dark:border-white/10 sm:even:border-l lg:border-b-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-black">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="overflow-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200 text-left dark:divide-white/10">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="w-[18%] px-4 py-4">Property</th>
                <th className="w-[14%] px-4 py-4">Location</th>
                <th className="w-[11%] px-4 py-4">Rent</th>
                <th className="w-[11%] px-4 py-4">Contract</th>
                <th className="w-[10%] px-4 py-4">Status</th>
                <th className="w-[16%] px-4 py-4">Payment</th>
                <th className="w-[8%] px-4 py-4">Date</th>
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
                  <td className="px-4 py-4 text-sm font-bold text-slate-950 dark:text-white">
                    {formatContractYears(request.contractYears)}
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
                  <td className="px-4 py-4 pr-6">
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

      <div className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-200 pt-6 text-slate-600 dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white">Need another place?</h3>
          <p className="mt-1 text-sm">Browse more properties or check your saved favourites while waiting for updates.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/properties.php" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700">
            Browse properties
          </Link>
          <Link to="/favorites" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10">
            View favourites
          </Link>
        </div>
      </div>

      {checkoutOverlay}
    </>
  );
}
