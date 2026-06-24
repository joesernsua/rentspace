import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { AppUser, RegisterUserInput } from "../types/User";

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as AppUser;
  return { ...data, uid, roles: data.roles ?? [data.role] } as AppUser;
}

function getGoogleProfileDefaults(user: FirebaseUser) {
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Google User",
    displayName: user.displayName,
    email: user.email || "",
    phone: user.phoneNumber || "",
  };
}

export async function registerUser(input: RegisterUserInput): Promise<AppUser> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Please continue with Google before completing registration.");

  const userRef = doc(db, "users", currentUser.uid);
  const existingProfile = await getUserProfile(currentUser.uid);
  const existingRoles = existingProfile?.roles ?? (existingProfile ? [existingProfile.role] : []);
  const roles = Array.from(new Set([...existingRoles, input.role]));
  const storedRole = existingProfile?.role ?? input.role;
  const userData = {
    ...getGoogleProfileDefaults(currentUser),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: storedRole,
    roles,
    phone: "",
    updatedAt: serverTimestamp(),
  };

  if (existingProfile) {
    await updateDoc(userRef, userData);
  } else {
    await setDoc(userRef, { ...userData, createdAt: serverTimestamp() });
  }

  return {
    ...userData,
    role: input.role,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

export async function continueWithGoogle(): Promise<{ user: FirebaseUser; profile: AppUser | null }> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return { user: credential.user, profile: await getUserProfile(credential.user.uid) };
}

export async function loginWithGoogleUser(role?: AppUser["role"]): Promise<AppUser> {
  const { profile } = await continueWithGoogle();
  if (!profile) throw new Error("No user profile was found for this Google account.");
  if (role && !(profile.roles ?? [profile.role]).includes(role)) {
    throw new Error(`This Google account does not have a ${role} profile yet.`);
  }

  return role ? { ...profile, role } : profile;
}

export async function updateUserProfile(
  uid: string,
  data: Pick<AppUser, "name" | "phone">,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    name: data.name.trim(),
    displayName: data.name.trim(),
    phone: data.phone.trim(),
    updatedAt: serverTimestamp(),
  });
}

export function logoutUser() {
  return signOut(auth);
}
