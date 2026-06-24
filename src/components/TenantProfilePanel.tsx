import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../services/authService";
import {
  deleteUserPaymentMethod,
  getUserPaymentMethods,
  saveUserPaymentMethod,
} from "../services/paymentMethodService";
import type { UserPaymentMethod, UserPaymentMethodType } from "../types/PaymentMethod";

const paymentMethodTypes: UserPaymentMethodType[] = ["card", "google-pay", "fpx"];

function getPaymentMethodLabel(type: UserPaymentMethodType) {
  if (type === "google-pay") return "Google Pay";
  if (type === "fpx") return "FPX";
  return "Card";
}

export default function TenantProfilePanel({ compact = false }: { compact?: boolean }) {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name ?? "");
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState<UserPaymentMethodType>("card");
  const [cardLast4, setCardLast4] = useState("");
  const [expiration, setExpiration] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [savingPaymentMethod, setSavingPaymentMethod] = useState(false);
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<UserPaymentMethodType | null>(null);

  useEffect(() => {
    setName(userProfile?.name ?? "");
    setPhone(userProfile?.phone ?? "");
  }, [userProfile]);

  useEffect(() => {
    if (!currentUser) return;

    setPaymentMethodsLoading(true);
    getUserPaymentMethods(currentUser.uid)
      .then(setPaymentMethods)
      .catch(() => setPaymentMessage("Unable to load saved payment methods."))
      .finally(() => setPaymentMethodsLoading(false));
  }, [currentUser]);

  const resetPaymentForm = () => {
    setPaymentMethodType("card");
    setCardLast4("");
    setExpiration("");
    setZipCode("");
  };

  const handleEditPaymentMethod = (method: UserPaymentMethod) => {
    setPaymentMethodType(method.type);
    setCardLast4(method.cardLast4 ?? "");
    setExpiration(method.expiration ?? "");
    setZipCode(method.zipCode ?? "");
    setPaymentMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      setMessage("Name is required.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await updateUserProfile(currentUser.uid, { name, phone });
      await refreshProfile();
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentMethodSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    if (paymentMethodType === "card" && (cardLast4.trim().length !== 4 || !expiration.trim())) {
      setPaymentMessage("Card last 4 digits and expiry are required.");
      return;
    }

    setSavingPaymentMethod(true);
    setPaymentMessage("");
    try {
      await saveUserPaymentMethod({
        userId: currentUser.uid,
        type: paymentMethodType,
        ...(paymentMethodType === "card"
          ? {
              cardLast4: cardLast4.trim(),
              expiration: expiration.trim(),
              zipCode: zipCode.trim(),
            }
          : {}),
      });
      setPaymentMethods(await getUserPaymentMethods(currentUser.uid));
      setPaymentMessage("Payment method saved.");
      resetPaymentForm();
    } catch {
      setPaymentMessage("Unable to save payment method. Please try again.");
    } finally {
      setSavingPaymentMethod(false);
    }
  };

  const handleDeletePaymentMethod = async (type: UserPaymentMethodType) => {
    if (!currentUser) return;
    if (!window.confirm(`Delete saved ${getPaymentMethodLabel(type)} payment method?`)) return;

    setDeletingPaymentMethod(type);
    setPaymentMessage("");
    try {
      await deleteUserPaymentMethod(currentUser.uid, type);
      setPaymentMethods((items) => items.filter((item) => item.type !== type));
      setPaymentMessage("Payment method deleted.");
    } catch {
      setPaymentMessage("Unable to delete payment method. Please try again.");
    } finally {
      setDeletingPaymentMethod(null);
    }
  };

  if (!userProfile) return null;

  return (
    <section className={compact ? "p-3" : "rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`${compact ? "text-xl" : "text-2xl"} font-black text-slate-950 dark:text-white`}>Tenant Profile</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your account details.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
          {userProfile.email}
        </span>
      </div>

      <form onSubmit={handleSubmit} className={`mt-5 grid gap-4 ${compact ? "" : "md:grid-cols-[1fr_1fr_auto] md:items-end"}`}>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
          />
        </label>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
          Phone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional phone number"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
          />
        </label>
        <button
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
          {message}
        </p>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Payment Methods</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage saved payment methods for rentals.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {paymentMethods.length} saved
          </span>
        </div>

        {paymentMethodsLoading ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading payment methods...</p>
        ) : paymentMethods.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">No saved payment methods yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">{getPaymentMethodLabel(method.type)}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {method.type === "card"
                        ? `Card ending ${method.cardLast4 ?? "----"}${method.expiration ? ` · Expires ${method.expiration}` : ""}`
                        : "Saved for checkout"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPaymentMethod(method)}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingPaymentMethod === method.type}
                      onClick={() => void handleDeletePaymentMethod(method.type)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                    >
                      {deletingPaymentMethod === method.type ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handlePaymentMethodSubmit} className="mt-5 grid gap-4">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Type
            <select
              value={paymentMethodType}
              onChange={(event) => setPaymentMethodType(event.target.value as UserPaymentMethodType)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
            >
              {paymentMethodTypes.map((type) => (
                <option key={type} value={type}>{getPaymentMethodLabel(type)}</option>
              ))}
            </select>
          </label>

          {paymentMethodType === "card" && (
            <div className={`grid gap-4 ${compact ? "" : "md:grid-cols-3"}`}>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Last 4 digits
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={cardLast4}
                  onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Expiry
                <input
                  value={expiration}
                  onChange={(event) => setExpiration(event.target.value)}
                  placeholder="MM/YY"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                ZIP code
                <input
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              disabled={savingPaymentMethod}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingPaymentMethod ? "Saving..." : "Save payment method"}
            </button>
            <button
              type="button"
              onClick={resetPaymentForm}
              className="rounded-xl border border-slate-300 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </form>

        {paymentMessage && (
          <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {paymentMessage}
          </p>
        )}
      </div>
    </section>
  );
}
