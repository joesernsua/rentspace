import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { auth, db } from "../config/firebase";
import { normalizeAdminInviteEmail } from "../services/adminService";
import type { AppUser } from "../types/User";

function isAdminProfile(profile: AppUser | null) {
  return Boolean(
    profile &&
      (profile.role === "admin" || (profile.roles ?? []).includes("admin")),
  );
}

async function getAdminProfile(uid: string) {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as AppUser;
  return { ...data, uid, roles: data.roles ?? [data.role] };
}

async function createAdminProfileFromInvite(user: User) {
  if (!user.email) return null;

  const email = normalizeAdminInviteEmail(user.email);
  const inviteSnapshot = await getDoc(doc(db, "adminInvites", email));
  if (!inviteSnapshot.exists()) return null;
  const invite = inviteSnapshot.data() as { employeeRole?: string };

  const name = user.displayName || email.split("@")[0] || "Admin";
  const profile = {
    uid: user.uid,
    name,
    displayName: user.displayName ?? name,
    email,
    phone: user.phoneNumber ?? "",
    role: "admin",
    roles: ["admin"],
    adminEmployeeRole: invite.employeeRole ?? "manager",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), profile);

  try {
    await updateDoc(doc(db, "adminInvites", email), {
      status: "accepted",
      usedBy: user.uid,
      usedAt: serverTimestamp(),
    });
  } catch {
    // The user profile is the source of truth after first login.
  }

  return {
    ...profile,
    createdAt: undefined,
    updatedAt: undefined,
  } as AppUser;
}

function getLoginError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "auth/popup-closed-by-user") return "Google login was cancelled.";
  if (code === "auth/popup-blocked") return "Please allow pop-ups to login with Google.";
  if (code === "auth/operation-not-allowed") return "This Firebase sign-in method is not enabled.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Invalid admin email or password.";
  }
  if (code === "auth/user-not-found") {
    return "No admin account was found for this email.";
  }
  return error instanceof Error ? error.message : "Unable to login. Please try again.";
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const profile = await getAdminProfile(user.uid);
      if (isAdminProfile(profile)) {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      const invitedProfile = await createAdminProfileFromInvite(user);
      if (isAdminProfile(invitedProfile)) {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      await signOut(auth);
    });
  }, [navigate]);

  const completeAdminLogin = async (user: User) => {
    const profile = await getAdminProfile(user.uid);
    const invitedProfile = isAdminProfile(profile)
      ? profile
      : await createAdminProfileFromInvite(user);

    if (!isAdminProfile(invitedProfile)) {
      await signOut(auth);
      setError("Access denied. Admin account required.");
      return;
    }

    navigate("/admin-dashboard", { replace: true });
  };

  const runLogin = async (login: () => Promise<User>) => {
    setError("");
    setSubmitting(true);
    try {
      await completeAdminLogin(await login());
    } catch (loginError) {
      setError(getLoginError(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    void runLogin(async () => {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      return credential.user;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runLogin(async () => {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      return credential.user;
    });
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#070b1d] px-5 py-10 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.22),transparent_38%)]" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1024] shadow-2xl shadow-black/40 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden border-r border-white/10 bg-[#101834] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-xl font-black text-[#07111f] shadow-lg shadow-emerald-400/20">
              R
            </div>
            <p className="mt-8 text-sm font-black uppercase tracking-[0.28em] text-emerald-300">Secure admin access</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white">RentSpace Admin</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              Review platform activity, manage listings, and monitor simulated payment history from a dedicated admin workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold text-slate-400">
            <span className="rounded-xl bg-white/5 p-3">Users</span>
            <span className="rounded-xl bg-white/5 p-3">Rentals</span>
            <span className="rounded-xl bg-white/5 p-3">Payments</span>
          </div>
        </div>

        <div className="p-8 sm:p-12 lg:p-16">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">Admin Portal</p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">Sign in to dashboard</h2>
          <p className="mt-3 text-sm text-slate-400">Only manually provisioned Firebase admin accounts can continue.</p>

          <div className="mt-9 space-y-5">
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-5 py-3.5 font-black text-slate-950 shadow-lg shadow-black/20 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <img src="/google-logo.jpg" alt="" className="h-5 w-5 rounded-full object-cover" aria-hidden="true" />
              {submitting ? "Checking access..." : "Login using Google"}
            </button>

            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>or email</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <label className="block text-sm font-bold text-slate-300">
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
                placeholder="admin@rentspace.com"
              />
            </label>

            <label className="block text-sm font-bold text-slate-300">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#070b1d] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10"
                placeholder="Enter password"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-400 px-5 py-3.5 font-black text-[#07111f] shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Checking access..." : "Login to Admin Portal"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
