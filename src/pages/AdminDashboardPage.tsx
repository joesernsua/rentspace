import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import {
  deletePropertyAsAdmin,
  getAllProperties,
  getAllRentalRequests,
  getAllUsers,
} from "../services/adminService";
import type { Property } from "../types/Property";
import type { RentalRequest } from "../types/RentalRequest";
import type { AppUser } from "../types/User";

function formatDate(value: AppUser["createdAt"] | RentalRequest["createdAt"]) {
  return value ? value.toDate().toLocaleDateString() : "-";
}

function formatPrice(value: Property["price"] | RentalRequest["propertyPrice"]) {
  return typeof value === "number" ? `RM ${value.toLocaleString()}` : "-";
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

const navItems = [
  { label: "Dashboard", href: "#dashboard", icon: "D", active: true },
  { label: "Reports", href: "#dashboard", icon: "R" },
  { label: "Users", href: "#users", icon: "U" },
  { label: "Properties", href: "#properties", icon: "P" },
  { label: "Rental requests", href: "#rental-requests", icon: "Q" },
];

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [propertiesError, setPropertiesError] = useState("");
  const [requestsError, setRequestsError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => setUsersError("Unable to load users."))
      .finally(() => setUsersLoading(false));
    getAllProperties()
      .then(setProperties)
      .catch(() => setPropertiesError("Unable to load properties."))
      .finally(() => setPropertiesLoading(false));
    getAllRentalRequests()
      .then(setRequests)
      .catch(() => setRequestsError("Unable to load rental requests."))
      .finally(() => setRequestsLoading(false));
  }, []);

  const handleDelete = async (property: Property) => {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
    setDeletingId(property.id);
    setPropertiesError("");
    try {
      await deletePropertyAsAdmin(property.id);
      setProperties((items) => items.filter((item) => item.id !== property.id));
    } catch {
      setPropertiesError("Unable to delete the property.");
    } finally {
      setDeletingId(null);
    }
  };

  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const approvedRequests = requests.filter((request) => request.status === "approved").length;
  const availableProperties = properties.filter((property) => property.status === "available").length;
  const totalMonthlyRent = properties.reduce((total, property) => total + (typeof property.price === "number" ? property.price : 0), 0);

  const summaryCards = [
    { label: "Total users", value: usersLoading ? "-" : users.length.toLocaleString(), icon: "U", change: "+ active" },
    { label: "Properties", value: propertiesLoading ? "-" : properties.length.toLocaleString(), icon: "P", change: `${availableProperties} available` },
    { label: "Requests", value: requestsLoading ? "-" : requests.length.toLocaleString(), icon: "R", change: `${pendingRequests} pending` },
    { label: "Monthly rent", value: propertiesLoading ? "-" : formatPrice(totalMonthlyRent), icon: "$", change: "listed value" },
  ];

  const chartBars = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const propertyHeight = 32 + ((properties.length + index * 13) % 64);
        const requestHeight = 28 + ((requests.length + index * 17) % 70);
        return { propertyHeight, requestHeight };
      }),
    [properties.length, requests.length],
  );

  return (
    <main className="min-h-[calc(100vh-145px)] bg-[#070b1d] text-slate-100">
      <div className="grid min-h-[calc(100vh-145px)] lg:grid-cols-[19rem_1fr]">
        <aside className="flex border-b border-white/10 bg-[#0b1024] p-6 lg:min-h-[calc(100vh-145px)] lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-400 to-fuchsia-500 text-lg font-black text-white shadow-lg shadow-fuchsia-500/20">
              R
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-300 ring-4 ring-[#0b1024]" />
            </span>
            <div>
              <p className="text-xl font-black tracking-tight text-white">RentSpace X</p>
              <p className="text-xs text-slate-500">Admin control</p>
            </div>
          </div>

          <label className="mt-9 flex items-center gap-3 rounded-xl border border-[#26345f] bg-[#121a35] px-4 py-3 text-sm text-slate-400 shadow-inner shadow-black/10">
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-slate-600 text-[10px]">/</span>
            <input className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder="Search for..." />
          </label>

          <nav className="mt-8 space-y-1">
            <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">All pages</p>
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  item.active
                    ? "bg-[#141d40] text-emerald-300 shadow-[inset_3px_0_0_#10b981]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${
                    item.active ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300">&gt;</span>
              </a>
            ))}
          </nav>
        </aside>

        <section id="dashboard" className="overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Welcome back, Admin</h1>
              <p className="mt-2 text-sm text-slate-400">Monitor users, properties, and rental activity across the platform.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="rounded-xl border border-white/10 bg-[#111936] px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">Export data</button>
              <button type="button" className="rounded-xl bg-fuchsia-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 hover:bg-fuchsia-400">Create report</button>
            </div>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((summary) => (
              <article key={summary.label} className="rounded-2xl border border-white/10 bg-[#101834] p-5 shadow-xl shadow-black/10">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span className="flex items-center gap-2"><span>{summary.icon}</span>{summary.label}</span>
                  <span>...</span>
                </div>
                <div className="mt-5 flex items-end gap-3">
                  <p className="text-3xl font-black text-white">{summary.value}</p>
                  <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300">{summary.change}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_0.9fr]">
            <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-400">Total listed rent</p>
                  <p className="mt-2 text-3xl font-black text-white">{formatPrice(totalMonthlyRent)}</p>
                </div>
                <div className="flex gap-4 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Properties</span>
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Requests</span>
                </div>
              </div>
              <div className="mt-10 h-64 rounded-2xl bg-[linear-gradient(180deg,rgba(217,70,239,0.12),transparent)] p-5">
                <div className="flex h-full items-end gap-3">
                  {chartBars.map((bar, index) => (
                    <div key={index} className="flex flex-1 items-end justify-center gap-1">
                      <span className="w-2 rounded-t-full bg-fuchsia-500" style={{ height: `${bar.propertyHeight}%` }} />
                      <span className="w-2 rounded-t-full bg-cyan-400" style={{ height: `${bar.requestHeight}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className="grid gap-5">
              <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                <p className="text-sm font-bold text-slate-400">Request approval rate</p>
                <p className="mt-2 text-3xl font-black text-white">{percent(approvedRequests, requests.length)}%</p>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${percent(approvedRequests, requests.length)}%` }} />
                </div>
                <p className="mt-4 text-sm text-slate-500">{approvedRequests} approved from {requests.length} total requests.</p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
                <p className="text-sm font-bold text-slate-400">Property availability</p>
                <p className="mt-2 text-3xl font-black text-white">{percent(availableProperties, properties.length)}%</p>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-400">
                  <span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300">{availableProperties}<br />Available</span>
                  <span className="rounded-xl bg-amber-400/10 p-3 text-amber-300">{properties.filter((item) => item.status === "pending").length}<br />Pending</span>
                  <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">{properties.filter((item) => item.status === "rented").length}<br />Rented</span>
                </div>
              </article>
            </div>
          </section>

          {(usersError || propertiesError || requestsError) && (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {[usersError, propertiesError, requestsError].filter(Boolean).join(" ")}
            </div>
          )}

          <section id="users" className="mt-8 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Users</h2>
                <p className="mt-1 text-sm text-slate-400">Registered accounts and platform roles.</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">{users.length} records</span>
            </div>
            {usersLoading ? <p className="mt-5 text-slate-400">Loading users...</p> : users.length === 0 ? <p className="mt-5 text-slate-400">No users found.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Name</th><th className="py-3 pr-5">Email</th><th className="py-3 pr-5">Role</th><th className="py-3 pr-5">Created</th></tr></thead>
                  <tbody>{users.map((user) => <tr key={user.uid} className="border-t border-white/10"><td className="py-4 pr-5 font-semibold text-white">{user.name || user.displayName || "-"}</td><td className="py-4 pr-5 text-slate-300">{user.email}</td><td className="py-4 pr-5"><StatusBadge value={user.role} /></td><td className="py-4 pr-5 text-slate-500">{formatDate(user.createdAt)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section id="properties" className="mt-5 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Properties</h2>
                <p className="mt-1 text-sm text-slate-400">Monitor every listing and remove obsolete properties.</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">{properties.length} listings</span>
            </div>
            {propertiesLoading ? <p className="mt-5 text-slate-400">Loading properties...</p> : properties.length === 0 ? <p className="mt-5 text-slate-400">No properties found.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Title</th><th className="py-3 pr-5">Location</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Type</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Owner ID</th><th className="py-3 pr-5">Action</th></tr></thead>
                  <tbody>{properties.map((property) => <tr key={property.id} className="border-t border-white/10"><td className="py-4 pr-5 font-semibold text-white">{property.title}</td><td className="py-4 pr-5 text-slate-300">{property.location}</td><td className="py-4 pr-5 text-slate-300">{formatPrice(property.price)}</td><td className="py-4 pr-5 text-slate-300">{property.type}</td><td className="py-4 pr-5"><StatusBadge value={property.status} /></td><td className="max-w-48 truncate py-4 pr-5 font-mono text-xs text-slate-500">{property.ownerId}</td><td className="py-4 pr-5"><button disabled={deletingId === property.id} type="button" onClick={() => void handleDelete(property)} className="rounded-lg bg-red-500/10 px-3 py-2 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60">{deletingId === property.id ? "Deleting..." : "Delete"}</button></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section id="rental-requests" className="mt-5 rounded-2xl border border-white/10 bg-[#101834] p-6 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Rental requests</h2>
                <p className="mt-1 text-sm text-slate-400">Rental demand and request outcomes.</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">{pendingRequests} pending</span>
            </div>
            {requestsLoading ? <p className="mt-5 text-slate-400">Loading rental requests...</p> : requests.length === 0 ? <p className="mt-5 text-slate-400">No rental requests found.</p> : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="text-slate-500"><tr><th className="py-3 pr-5">Property</th><th className="py-3 pr-5">Tenant</th><th className="py-3 pr-5">Email</th><th className="py-3 pr-5">Price</th><th className="py-3 pr-5">Status</th><th className="py-3 pr-5">Created</th></tr></thead>
                  <tbody>{requests.map((request) => <tr key={request.id} className="border-t border-white/10"><td className="py-4 pr-5 font-semibold text-white">{request.propertyTitle}</td><td className="py-4 pr-5 text-slate-300">{request.tenantName}</td><td className="py-4 pr-5 text-slate-300">{request.tenantEmail}</td><td className="py-4 pr-5 text-slate-300">{formatPrice(request.propertyPrice)}</td><td className="py-4 pr-5"><StatusBadge value={request.status} /></td><td className="py-4 pr-5 text-slate-500">{formatDate(request.createdAt)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
