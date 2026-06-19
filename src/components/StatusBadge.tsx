type BadgeValue =
  | "available"
  | "pending"
  | "rented"
  | "approved"
  | "rejected"
  | "tenant"
  | "owner"
  | "admin";

const badgeClasses: Record<BadgeValue, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rented: "bg-sky-50 text-sky-700 ring-sky-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  tenant: "bg-sky-50 text-sky-700 ring-sky-600/20",
  owner: "bg-violet-50 text-violet-700 ring-violet-600/20",
  admin: "bg-slate-100 text-slate-700 ring-slate-600/20",
};

const badgeLabels: Partial<Record<BadgeValue, string>> = {
  approved: "accepted",
};

export default function StatusBadge({ value }: { value: BadgeValue }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${badgeClasses[value]}`}>
      {badgeLabels[value] ?? value}
    </span>
  );
}
