import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { auth, db } from "../config/firebase";
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

export default function AdminProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setState("denied");
        return;
      }

      try {
        if (isAdminProfile(await getAdminProfile(user.uid))) {
          setState("allowed");
          return;
        }
        await signOut(auth);
        setState("denied");
      } catch {
        setState("denied");
      }
    });
  }, []);

  if (state === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#070b1d] text-slate-300">
        Checking admin access...
      </main>
    );
  }

  if (state === "denied") {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
