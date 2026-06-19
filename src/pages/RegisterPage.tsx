import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { getDashboardPath } from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import type { AppUser, UserRole } from "../types/User";

type RegisterRole = Exclude<UserRole, "admin">;

function getErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "auth/popup-closed-by-user") return "Google sign up was cancelled.";
  if (code === "auth/popup-blocked") return "Please allow pop-ups to sign up with Google.";
  if (code === "auth/account-exists-with-different-credential") return "This email already uses another login method.";
  return error instanceof Error ? error.message : "Registration failed. Please try again.";
}

function getOppositeRole(profile: AppUser | null): RegisterRole {
  const roles = profile?.roles ?? (profile ? [profile.role] : []);
  return roles.includes("tenant") ? "owner" : "tenant";
}

function getPostAuthPath(role: UserRole) {
  return role === "tenant" ? "/dashboard.html" : getDashboardPath(role);
}

export default function RegisterPage() {
  const { continueWithGoogle, register, selectRole, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [googleReady, setGoogleReady] = useState(false);
  const [existingProfile, setExistingProfile] = useState<AppUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RegisterRole>("tenant");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Checking your session...</main>;
  }
  if (userProfile && !googleReady) return <Navigate to={getDashboardPath(userProfile.role)} replace />;

  const handleGoogleContinue = async () => {
    setError("");
    setSubmitting(true);
    try {
      const result = await continueWithGoogle();
      const profile = result.profile;
      setExistingProfile(profile);
      setGoogleReady(true);
      setName(profile?.name || result.user.displayName || "");
      setEmail(profile?.email || result.user.email || "");
      setRole(getOppositeRole(profile));
    } catch (registerError) {
      setError(getErrorMessage(registerError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginExisting = async (loginRole: UserRole) => {
    setError("");
    setSubmitting(true);
    try {
      const profile = await selectRole(loginRole);
      navigate(getPostAuthPath(profile.role), { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const profile = await register({ name, email, role });
      navigate(getPostAuthPath(profile.role), { replace: true });
    } catch (registerError) {
      setError(getErrorMessage(registerError));
    } finally {
      setSubmitting(false);
    }
  };

  const existingRoles = existingProfile?.roles ?? (existingProfile ? [existingProfile.role] : []);
  const canRegisterRole = !existingRoles.includes(role);
  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.28),transparent_40%)]" />
      <div className="relative grid min-h-[560px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl sm:min-h-[620px] lg:grid-cols-[1fr_1.1fr]">
        <section className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
          <Link to="/" className="flex items-center gap-3 text-sm font-black tracking-[0.2em] text-emerald-300">
            <span className="brand-house" aria-hidden="true" /> RENTSPACE
          </Link>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Join RentSpace</p>
            <h1 className="mt-5 text-4xl font-black leading-tight">Choose the dashboard that fits your role.</h1>
            <p className="mt-5 leading-7 text-slate-400">
              One Google account can hold both tenant and owner profiles, so switching roles stays simple.
            </p>
          </div>
          <p className="text-xs text-slate-500">Property Rental Management System</p>
        </section>

        <section className="flex min-h-[560px] flex-col justify-center p-8 sm:min-h-[620px] sm:p-12 lg:p-16">
          <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-indigo-600">← Back to home</Link>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Account setup</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Create an Account</h2>
          <p className="mt-3 text-slate-600">Continue with Google, then complete the role profile you want to use.</p>

          {!googleReady ? (
            <div className="mt-8 space-y-5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleContinue}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-bold text-slate-900 shadow-lg shadow-slate-900/5 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img src="/google-logo.jpg" alt="" className="h-5 w-5 rounded-full object-cover" aria-hidden="true" />
                {submitting ? "Opening Google..." : "Continue with Google"}
              </button>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {existingRoles.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-bold">We found an existing {existingRoles.join(" and ")} profile for this Google account.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {existingRoles.map((existingRole) => (
                      <button
                        key={existingRole}
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleLoginExisting(existingRole)}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Login as {existingRole}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block text-sm font-semibold text-slate-700">
                  Name
                  <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Your full name" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Register as
                  <select value={role} onChange={(event) => setRole(event.target.value as RegisterRole)} className={inputClass}>
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                  </select>
                  <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">
                    Tenants can apply for rentals. Owners can publish properties and review applications.
                  </span>
                </label>
                {!canRegisterRole && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    This account already has a {role} profile. Choose the other role or login as {role}.
                  </p>
                )}
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <button
                  disabled={submitting || !canRegisterRole}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Register as " + role}
                </button>
              </form>
            </div>
          )}

          <p className="mt-6 text-sm text-slate-600">
            Already registered? <Link to="/login.html" className="font-bold text-indigo-600 hover:text-indigo-500">Login</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
