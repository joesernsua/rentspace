import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { getDashboardPath } from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/User";

function getErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "auth/popup-closed-by-user") return "Google login was cancelled.";
  if (code === "auth/popup-blocked") return "Please allow pop-ups to login with Google.";
  if (code === "auth/account-exists-with-different-credential") return "This email already uses another login method.";
  return error instanceof Error ? error.message : "Google login failed. Please try again.";
}

function getPostAuthPath(role: UserRole) {
  return role === "tenant" ? "/dashboard.html" : getDashboardPath(role);
}

export default function LoginPage() {
  const { loginWithGoogle, selectRole, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [roleChoices, setRoleChoices] = useState<UserRole[]>([]);

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Checking your session...</main>;
  }
  if (userProfile) return <Navigate to={getDashboardPath(userProfile.role)} replace />;

  const handleGoogleLogin = async () => {
    setError("");
    setSubmitting(true);
    try {
      const profile = await loginWithGoogle();
      const roles = profile.roles ?? [profile.role];
      if (roles.length > 1) {
        setRoleChoices(roles);
      } else {
        navigate(getPostAuthPath(profile.role), { replace: true });
      }
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleLogin = async (role: UserRole) => {
    setError("");
    setSubmitting(true);
    try {
      const profile = await selectRole(role);
      navigate(getPostAuthPath(profile.role), { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    navigate(trimmedEmail ? `/register?email=${encodeURIComponent(trimmedEmail)}` : "/register");
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.28),transparent_40%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1fr_1.1fr]">
        <section className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <Link to="/" className="flex items-center gap-3 text-sm font-black tracking-[0.2em] text-emerald-300">
            <span className="brand-house" aria-hidden="true" /> RENTSPACE
          </Link>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">Welcome home</p>
            <h1 className="mt-5 text-4xl font-black leading-tight">Manage your rental journey in one place.</h1>
            <p className="mt-5 leading-7 text-slate-400">Access properties, rental requests, and your role-based dashboard securely.</p>
          </div>
          <p className="text-xs text-slate-500">Property Rental Management System</p>
        </section>

        <section className="p-8 sm:p-12 lg:p-16">
          <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-indigo-600">← Back to home</Link>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Account access</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Login to RentSpace</h2>
          <p className="mt-3 text-slate-600">Use your Google account to continue.</p>

          <div className="mt-8 space-y-5">
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-bold text-slate-900 shadow-lg shadow-slate-900/5 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img src="/google-logo.jpg" alt="" className="h-5 w-5 rounded-full object-cover" aria-hidden="true" />
              {submitting ? "Opening Google..." : "Login using Google"}
            </button>
            <div className="flex items-center gap-4 text-xs font-bold uppercase text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>OR</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <form onSubmit={handleEmailContinue} className="space-y-4">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Email address"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
              >
                Continue
              </button>
            </form>
            {roleChoices.length > 1 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-bold">Choose which dashboard to open:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleChoices.map((role) => (
                    <button
                      key={role}
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleRoleLogin(role)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Login as {role}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          </div>

          <p className="mt-6 text-sm text-slate-600">New to RentSpace? <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-500">Create an account</Link></p>
        </section>
      </div>
    </main>
  );
}
