import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageIntro from "../components/PageIntro";
import { CheckoutOverlay } from "../components/TenantRequestStatusPanel";
import { useAuth } from "../context/AuthContext";
import { getTenantPaymentHistory } from "../services/paymentHistoryService";
import { getPropertyById } from "../services/propertyService";
import { getTenantRentalRequests } from "../services/rentalRequestService";
import type { PaymentHistory } from "../types/PaymentHistory";
import type { RentalRequest } from "../types/RentalRequest";
import { getPaidRequestIds } from "../utils/rentalPayments";

type RentedRequest = RentalRequest & {
  payment: NonNullable<RentalRequest["payment"]>;
};

type RentalPaymentLineItem = {
  id: string;
  label: string;
  monthNumber: number;
  type: "rent" | "utilities";
  amount: number | null;
};

function formatPrice(price: number) {
  return `RM ${price.toLocaleString()}`;
}

function formatContractYears(years = 1) {
  return `${years} year${years === 1 ? "" : "s"}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function addOneMonth(date: Date) {
  const targetMonth = date.getMonth() + 1;
  const lastDayOfTargetMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(
    date.getFullYear(),
    targetMonth,
    Math.min(date.getDate(), lastDayOfTargetMonth),
  );
}

function addMonths(date: Date, months: number) {
  const targetMonth = date.getMonth() + months;
  const lastDayOfTargetMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(
    date.getFullYear(),
    targetMonth,
    Math.min(date.getDate(), lastDayOfTargetMonth),
  );
}

function getDateFromTimestamp(value: RentalRequest["updatedAt"]) {
  return value?.toDate?.();
}

function getNextBillingDate(request: RentedRequest) {
  return addOneMonth(getDateFromTimestamp(request.payment.paidAt) ?? getDateFromTimestamp(request.updatedAt) ?? new Date());
}

function getBillingPeriodLabel(request: RentedRequest, monthNumber: number) {
  const startDate = addMonths(
    getDateFromTimestamp(request.payment.paidAt) ?? getDateFromTimestamp(request.updatedAt) ?? new Date(),
    monthNumber - 1,
  );
  const endDate = addMonths(startDate, 1);
  return `${formatShortDate(startDate)} to ${formatShortDate(endDate)}`;
}

function getRentalPaymentItems(request: RentedRequest): RentalPaymentLineItem[] {
  return Array.from({ length: Math.max(request.contractYears, 1) * 12 }, (_, index) => {
    const monthNumber = index + 1;
    const utilityAmount = request.payment.monthlyUtilities?.[String(monthNumber)];
    const billingPeriod = getBillingPeriodLabel(request, monthNumber);

    return [
      {
        id: `${request.id}-month-${monthNumber}-rent`,
        label: `${billingPeriod} rent`,
        monthNumber,
        type: "rent" as const,
        amount: request.payment.monthlyRent,
      },
      {
        id: `${request.id}-month-${monthNumber}-utilities`,
        label: `${billingPeriod} utilities`,
        monthNumber,
        type: "utilities" as const,
        amount: typeof utilityAmount === "number" ? utilityAmount : null,
      },
    ];
  }).flat();
}

function getPaymentItemId(
  requestId: string,
  monthNumber: number,
  type: "rent" | "utilities",
) {
  return `${requestId}-month-${monthNumber}-${type}`;
}

function getPaidPaymentItemIds(history: PaymentHistory[]) {
  return new Set(
    history.flatMap((record) =>
      (record.lineItems ?? []).map((item) =>
        getPaymentItemId(record.requestId, item.monthNumber, item.type),
      ),
    ),
  );
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

function isRentedRequest(request: RentalRequest): request is RentedRequest {
  return Boolean(request.payment && (request.payment.status === "paid" || getPaidRequestIds().has(request.id)));
}

export default function MyRentalsPage() {
  const { currentUser, userProfile } = useAuth();
  const [rentals, setRentals] = useState<RentedRequest[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);
  const [paymentRental, setPaymentRental] = useState<RentedRequest | null>(null);
  const [checkoutRental, setCheckoutRental] = useState<{
    rental: RentedRequest;
    items: Array<Omit<RentalPaymentLineItem, "id"> & { amount: number }>;
    totalPaid: number;
  } | null>(null);
  const [selectedPaymentItemIds, setSelectedPaymentItemIds] = useState<Set<string>>(new Set());
  const [paymentMessage, setPaymentMessage] = useState("");
  const paidRequestIds = getPaidRequestIds();
  const paidPaymentItemIds = getPaidPaymentItemIds(paymentHistory);

  useEffect(() => {
    if (!currentUser || !userProfile) {
      return;
    }

    Promise.all([
      getTenantRentalRequests(currentUser.uid).then(addPropertyImageUrls),
      getTenantPaymentHistory(currentUser.uid),
    ])
      .then(([items, history]) => {
        setRentals(items.filter(isRentedRequest));
        setPaymentHistory(history);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [currentUser, userProfile]);

  const openRentalPayment = (rental: RentedRequest) => {
    const items = getRentalPaymentItems(rental);
    const firstRentItem = items.find((item) =>
      item.type === "rent" && !paidPaymentItemIds.has(item.id),
    );
    setPaymentRental(rental);
    setSelectedPaymentItemIds(new Set(firstRentItem ? [firstRentItem.id] : []));
    setPaymentMessage("");
  };

  const togglePaymentItem = (itemId: string) => {
    setSelectedPaymentItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleRentalPayment = async () => {
    if (!currentUser || !userProfile || !paymentRental || payingRentalId) return;

    const selectedItems = getRentalPaymentItems(paymentRental).filter((item) =>
      selectedPaymentItemIds.has(item.id) &&
      typeof item.amount === "number" &&
      !paidPaymentItemIds.has(item.id),
    );
    const totalPaid = selectedItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    if (selectedItems.length === 0 || totalPaid <= 0) {
      setPaymentMessage("Please select at least one rent or utilities item to pay.");
      return;
    }

    setCheckoutRental({
      rental: paymentRental,
      items: selectedItems.map(({ id: _id, amount, ...item }) => ({
        ...item,
        amount: amount ?? 0,
      })),
      totalPaid,
    });
    setPaymentRental(null);
    setPaymentMessage("");
  };

  const handleMonthlyPaymentSuccess = (requestId: string) => {
    if (checkoutRental) {
      const paidLineItems = checkoutRental.items.map((item) => ({
        label: item.label,
        monthNumber: item.monthNumber,
        type: item.type,
        amount: item.amount,
      }));
      setPaymentHistory((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          requestId,
          propertyId: checkoutRental.rental.propertyId,
          propertyTitle: checkoutRental.rental.propertyTitle,
          propertyLocation: checkoutRental.rental.propertyLocation,
          ownerId: checkoutRental.rental.ownerId,
          tenantId: checkoutRental.rental.tenantId,
          tenantName: checkoutRental.rental.tenantName,
          tenantEmail: checkoutRental.rental.tenantEmail,
          contractYears: checkoutRental.rental.contractYears,
          paymentMethodType: "card",
          rentDeposit: 0,
          utilityDeposit: 0,
          monthlyRent: paidLineItems
            .filter((item) => item.type === "rent")
            .reduce((sum, item) => sum + item.amount, 0),
          totalPaid: checkoutRental.totalPaid,
          billingPeriod: "monthly",
          lineItems: paidLineItems,
          status: "paid",
        },
      ]);
    }
    setCheckoutRental(null);
    setSelectedPaymentItemIds(new Set());
    setPayingRentalId(null);
    setPaymentMessage("Rental payment recorded.");
  };

  return (
    <PageIntro
      wide
      title="My Rentals"
      description="View the homes you have rented and keep track of your upcoming monthly billing."
    >
      {loadState === "loading" && <p className="text-slate-600 dark:text-slate-400">Loading your rentals...</p>}

      {loadState === "error" && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-200">Unable to load your rentals. Please try again.</p>}

      {paymentMessage && (
        <p role="status" className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-slate-200">
          {paymentMessage}
        </p>
      )}

      {loadState === "ready" && rentals.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-6 text-slate-600 dark:bg-white/5 dark:text-slate-400">
          <p>You do not have any active rentals yet.</p>
          <Link to="/properties.php" className="mt-3 inline-block font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-white">
            Browse available properties
          </Link>
        </div>
      )}

      {loadState === "ready" && rentals.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[11%]" />
              <col className="w-[17%]" />
              <col className="w-[12%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-slate-100 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4">Property</th>
                <th className="px-5 py-4">Contract</th>
                <th className="px-5 py-4">Bill this month</th>
                <th className="px-5 py-4">Next bill</th>
                <th className="px-5 py-4">Due date</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rentals.map((rental) => {
                const isPaid = rental.payment.status === "paid" || paidRequestIds.has(rental.id);

                return (
                  <tr key={rental.id} className="align-middle transition hover:bg-white/70 dark:hover:bg-white/[0.03]">
                    <td className="py-4 pl-2 pr-5">
                      <div className="flex min-w-0 items-center gap-4">
                        <img
                          src={rental.propertyImageUrl || "/care.jpg"}
                          alt={rental.propertyTitle}
                          className="h-20 w-24 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Active rental</p>
                          <h2 className="mt-1 truncate text-base font-black text-slate-950 dark:text-white">{rental.propertyTitle}</h2>
                          <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">{rental.propertyLocation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-950 dark:text-white">
                      {formatContractYears(rental.contractYears)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-950 dark:text-white">{formatPrice(rental.payment.monthlyRent)}</span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-amber-50 text-amber-700 ring-amber-600/20"
                        }`}>
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-950 dark:text-white">
                      {formatPrice(rental.payment.monthlyRent)}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-950 dark:text-white">
                      {formatDate(getNextBillingDate(rental))}
                    </td>
                    <td className="px-5 py-4 pr-6">
                      <button
                        type="button"
                        disabled={payingRentalId === rental.id}
                        onClick={() => openRentalPayment(rental)}
                        className="whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {payingRentalId === rental.id ? "Paying..." : "Make payment"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paymentRental && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <section className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-slate-900 dark:text-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-white/10">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">Rental payment</p>
                <h2 className="mt-3 text-2xl font-black">{paymentRental.propertyTitle}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Select rent and utilities separately. You can pay future months earlier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPaymentRental(null);
                  setSelectedPaymentItemIds(new Set());
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-6">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[41%]" />
                  <col className="w-[41%]" />
                </colgroup>
                <thead className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="pb-3">Month</th>
                    <th className="pb-3">Rent</th>
                    <th className="pb-3">Utilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {Array.from({ length: Math.max(paymentRental.contractYears, 1) * 12 }, (_, index) => {
                    const monthNumber = index + 1;
                    const rentItemId = `${paymentRental.id}-month-${monthNumber}-rent`;
                    const utilityItemId = `${paymentRental.id}-month-${monthNumber}-utilities`;
                    const utilityAmount = paymentRental.payment.monthlyUtilities?.[String(monthNumber)];
                    const hasUtilityAmount = typeof utilityAmount === "number";
                    const billingPeriod = getBillingPeriodLabel(paymentRental, monthNumber);
                    const isRentPaid = paidPaymentItemIds.has(rentItemId);
                    const isUtilitiesPaid = paidPaymentItemIds.has(utilityItemId);

                    return (
                      <tr key={monthNumber}>
                        <td className="py-4 font-black">{billingPeriod}</td>
                        <td className="py-4 pr-4">
                          <label className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5 ${
                            isRentPaid ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                          }`}>
                            <span>
                              <span className="flex items-center gap-2 font-bold">
                                Rent
                                {isRentPaid && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-600/20">
                                    Paid
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{formatPrice(paymentRental.payment.monthlyRent)}</span>
                            </span>
                            <input
                              type="checkbox"
                              disabled={isRentPaid}
                              checked={!isRentPaid && selectedPaymentItemIds.has(rentItemId)}
                              onChange={() => togglePaymentItem(rentItemId)}
                              className="h-5 w-5"
                            />
                          </label>
                        </td>
                        <td className="py-4">
                          <label className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5 ${
                            hasUtilityAmount && !isUtilitiesPaid ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                          }`}>
                            <span>
                              <span className="flex items-center gap-2 font-bold">
                                Utilities
                                {isUtilitiesPaid && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-600/20">
                                    Paid
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {hasUtilityAmount ? formatPrice(utilityAmount) : "Not set by owner"}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              disabled={!hasUtilityAmount || isUtilitiesPaid}
                              checked={!isUtilitiesPaid && selectedPaymentItemIds.has(utilityItemId)}
                              onChange={() => togglePaymentItem(utilityItemId)}
                              className="h-5 w-5"
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 p-6 dark:border-white/10">
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Selected total</p>
                <p className="mt-1 text-2xl font-black">
                  {formatPrice(
                    getRentalPaymentItems(paymentRental)
                      .filter((item) => selectedPaymentItemIds.has(item.id) && typeof item.amount === "number")
                      .reduce((sum, item) => sum + (item.amount ?? 0), 0),
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={payingRentalId === paymentRental.id}
                onClick={() => void handleRentalPayment()}
                className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {payingRentalId === paymentRental.id ? "Paying..." : "Pay selected"}
              </button>
            </div>
          </section>
        </div>
      )}

      {checkoutRental && currentUser && (
        <CheckoutOverlay
          request={checkoutRental.rental}
          userId={currentUser.uid}
          onClose={() => {
            setCheckoutRental(null);
            setPayingRentalId(null);
          }}
          onPaymentSuccess={handleMonthlyPaymentSuccess}
          markRequestPaid={false}
          successBackLabel="Back to My Rentals"
          successBackTo="/my-rentals"
          paymentDetails={{
            rentDeposit: 0,
            utilityDeposit: 0,
            monthlyRent: checkoutRental.items
              .filter((item) => item.type === "rent")
              .reduce((sum, item) => sum + item.amount, 0),
            totalPaid: checkoutRental.totalPaid,
            billingPeriod: "monthly",
            lineItems: checkoutRental.items,
            priceRows: checkoutRental.items.map((item) => ({
              label: item.label,
              value: item.amount,
            })),
          }}
        />
      )}
    </PageIntro>
  );
}
