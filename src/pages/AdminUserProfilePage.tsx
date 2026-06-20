import { signOut } from "firebase/auth";
import { Link, useNavigate, useParams } from "react-router";
import AdminRoleBadge, { getUserRoles } from "../components/AdminRoleBadge";
import StatusBadge from "../components/StatusBadge";
import { auth } from "../config/firebase";
import {
  getAllPaymentHistory,
  getAllProperties,
  getAllRentalRequests,
  getUserAsAdmin,
} from "../services/adminService";
import type { PaymentHistory } from "../types/PaymentHistory";
import type { Property } from "../types/Property";
import type { RentalRequest } from "../types/RentalRequest";
import type { AppUser } from "../types/User";
import { useEffect, useMemo, useState } from "react";

function formatDate(value: AppUser["createdAt"] | PaymentHistory["paidAt"]) {
  return value ? value.toDate().toLocaleDateString() : "-";
}

function formatPrice(value: number) {
  return `RM ${value.toLocaleString()}`;
}

function getDisplayedPropertyStatus(property: Property, requests: RentalRequest[]) {
  const hasApprovedRental = requests.some(
    (request) =>
      request.propertyId === property.id &&
      request.ownerId === property.ownerId &&
      request.status === "approved",
  );

  return hasApprovedRental ? "rented" : property.status;
}

export default function AdminUserProfilePage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setError("Missing user id.");
      setLoading(false);
      return;
    }

    Promise.all([
      getUserAsAdmin(uid),
      getAllProperties(),
      getAllRentalRequests(),
      getAllPaymentHistory(),
    ])
      .then(([profile, allProperties, allRequests, allPayments]) => {
        setUser(profile);
        setProperties(allProperties.filter((property) => property.ownerId === uid));
        setRequests(
          allRequests.filter((request) => request.tenantId === uid || request.ownerId === uid),
        );
        setPayments(
          allPayments.filter((payment) => payment.tenantId === uid || payment.ownerId === uid),
        );
        if (!profile) setError("User profile not found.");
      })
      .catch(() => setError("Unable to load user profile."))
      .finally(() => setLoading(false));
  }, [uid]);

  const totals = useMemo(() => ({
    listedRent: properties.reduce((sum, property) => sum + property.price, 0),
    paid: payments.reduce((sum, payment) => sum + payment.totalPaid, 0),
  }), [payments, properties]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin-login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#070b1d] p-6 text-slate-100 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link to="/admin-dashboard" className="text-sm font-bold text-emerald-300 hover:text-emerald-200">&larr; Back to admin</Link>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white">User Profile</h1>
            <p className="mt-2 text-sm text-slate-400">Review account details, roles, listings, requests, and payment history.</p>
          </div>
          <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/20">Logout</button>
        </div>

        {loading && <p className="mt-8 text-slate-400">Loading user profile...</p>}
        {error && <p role="alert" className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

        {!loading && user && (
          <div className="mt-8 space-y-5">
            <section className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Account</p>
                  <h2 className="mt-3 text-3xl font-black text-white">{user.name || user.displayName || "-"}</h2>
                  <p className="mt-2 text-slate-400">{user.email}</p>
                  <p className="mt-3 break-all font-mono text-xs text-slate-500">{user.uid}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getUserRoles(user).map((role) => <AdminRoleBadge key={role} role={role} />)}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl bg-[#080d20] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Created</p>
                  <p className="mt-2 font-black text-white">{formatDate(user.createdAt)}</p>
                </article>
                <article className="rounded-2xl bg-[#080d20] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Phone</p>
                  <p className="mt-2 font-black text-white">{user.phone || "-"}</p>
                </article>
                <article className="rounded-2xl bg-[#080d20] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Listed rent</p>
                  <p className="mt-2 font-black text-white">{formatPrice(totals.listedRent)}</p>
                </article>
                <article className="rounded-2xl bg-[#080d20] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Payments</p>
                  <p className="mt-2 font-black text-white">{formatPrice(totals.paid)}</p>
                </article>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
              <h2 className="text-xl font-black text-white">Owned Properties</h2>
              {properties.length === 0 ? <p className="mt-4 text-slate-400">No owned properties.</p> : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-slate-500"><tr><th className="py-3 pr-5">Title</th><th className="py-3 pr-5">Location</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Status</th></tr></thead>
                    <tbody>{properties.map((property) => <tr key={property.id} className="border-t border-white/10"><td className="py-4 pr-5 font-semibold text-white">{property.title}</td><td className="py-4 pr-5 text-slate-300">{property.location}</td><td className="py-4 pr-5 text-slate-300">{formatPrice(property.price)}</td><td className="py-4 pr-5"><StatusBadge value={getDisplayedPropertyStatus(property, requests)} /></td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
              <h2 className="text-xl font-black text-white">Rental Requests</h2>
              {requests.length === 0 ? <p className="mt-4 text-slate-400">No rental requests.</p> : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[840px] text-left text-sm">
                    <thead className="text-slate-500"><tr><th className="py-3 pr-5">Property</th><th className="py-3 pr-5">Tenant</th><th className="py-3 pr-5">Owner ID</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Status</th></tr></thead>
                    <tbody>{requests.map((request) => <tr key={request.id} className="border-t border-white/10"><td className="py-4 pr-5 font-semibold text-white">{request.propertyTitle}</td><td className="py-4 pr-5 text-slate-300">{request.tenantName}</td><td className="max-w-48 truncate py-4 pr-5 font-mono text-xs text-slate-500">{request.ownerId}</td><td className="py-4 pr-5 text-slate-300">{formatPrice(request.propertyPrice)}</td><td className="py-4 pr-5"><StatusBadge value={request.status} /></td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
              <h2 className="text-xl font-black text-white">Payment History</h2>
              {payments.length === 0 ? <p className="mt-4 text-slate-400">No payment history.</p> : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="text-slate-500"><tr><th className="py-3 pr-5">Payment ID</th><th className="py-3 pr-5">Property</th><th className="py-3 pr-5">Billing</th><th className="py-3 pr-5">Method</th><th className="py-3 pr-5">Total</th><th className="py-3 pr-5">Paid Date</th></tr></thead>
                    <tbody>{payments.map((payment) => <tr key={payment.id} className="border-t border-white/10"><td className="max-w-44 truncate py-4 pr-5 font-mono text-xs text-slate-500" title={payment.id}>{payment.id}</td><td className="py-4 pr-5 font-semibold text-white">{payment.propertyTitle}</td><td className="py-4 pr-5 text-slate-300">{payment.billingPeriod}</td><td className="py-4 pr-5 text-slate-300">{payment.paymentMethodType}</td><td className="py-4 pr-5 text-slate-300">{formatPrice(payment.totalPaid)}</td><td className="py-4 pr-5 text-slate-500">{formatDate(payment.paidAt ?? payment.createdAt)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
