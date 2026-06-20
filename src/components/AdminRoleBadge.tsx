import type { UserRole } from "../types/User";

const adminRoleBadgeClasses: Record<UserRole, string> = {
  tenant: "border-sky-300/30 bg-sky-300/10 text-sky-200",
  owner: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  admin: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
};

export function getUserRoles(user: { role: UserRole; roles?: unknown[] }) {
  const roles = [...(user.roles ?? []), user.role]
    .map((role) => String(role).trim().toLowerCase())
    .filter((role): role is UserRole =>
      role === "tenant" || role === "owner" || role === "admin",
    );
  const roleOrder: UserRole[] = ["tenant", "owner", "admin"];
  return roleOrder.filter((role) => roles.includes(role));
}

export default function AdminRoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex min-w-20 justify-center rounded-full border px-3 py-1.5 text-xs font-black capitalize leading-none ${adminRoleBadgeClasses[role]}`}>
      {role}
    </span>
  );
}
