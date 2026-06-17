import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, db } from "../config/firebase";

export type UserRole = "customer" | "owner" | "admin";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  role: UserRole;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface AuthContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export class UserProfileSaveError extends Error {
  constructor() {
    super("Login succeeded, but user profile could not be saved.");
    this.name = "UserProfileSaveError";
  }
}

function logFirebaseError(error: unknown) {
  if (error && typeof error === "object") {
    const firebaseError = error as { code?: string; message?: string };
    console.error("Firebase error:", {
      code: firebaseError.code,
      message: firebaseError.message,
    });
    return;
  }

  console.error("Firebase error:", error);
}

async function saveUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);
  const existingProfile = userSnapshot.exists()
    ? (userSnapshot.data() as Partial<UserProfile>)
    : null;

  const profileData = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    role: existingProfile?.role ?? "customer",
    createdAt: existingProfile?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, profileData, { merge: true });

  const updatedSnapshot = await getDoc(userRef);
  return {
    ...(updatedSnapshot.data() as UserProfile),
  } as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);

      try {
        if (user) {
          const profile = await saveUserProfile(user);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        logFirebaseError(error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    setCurrentUser(credential.user);

    try {
      const profile = await saveUserProfile(credential.user);
      setUserProfile(profile);
    } catch (error) {
      logFirebaseError(error);
      throw new UserProfileSaveError();
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      loginWithGoogle,
      logout,
    }),
    [currentUser, userProfile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
