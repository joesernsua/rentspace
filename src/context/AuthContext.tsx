import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth } from "../config/firebase";
import {
  continueWithGoogle,
  getUserProfile,
  loginWithGoogleUser,
  logoutUser,
  registerUser,
} from "../services/authService";
import type { AppUser, RegisterUserInput, UserRole } from "../types/User";

export type UserProfile = AppUser;
export type { UserRole };

type AuthContextValue = {
  currentUser: FirebaseUser | null;
  userProfile: AppUser | null;
  loading: boolean;
  register: (input: RegisterUserInput) => Promise<AppUser>;
  logout: () => Promise<void>;
  continueWithGoogle: () => Promise<{ user: FirebaseUser; profile: AppUser | null }>;
  loginWithGoogle: (role?: UserRole) => Promise<AppUser>;
  selectRole: (role: UserRole) => Promise<AppUser>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export class UserProfileSaveError extends Error {
  constructor() {
    super("Login succeeded, but no user profile was found.");
    this.name = "UserProfileSaveError";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);

      try {
        setUserProfile(user ? await getUserProfile(user.uid) : null);
      } catch (error) {
        console.error("Unable to load user profile:", error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const register = async (input: RegisterUserInput) => {
    const profile = await registerUser(input);
    setCurrentUser(auth.currentUser);
    setUserProfile(profile);
    return profile;
  };

  const logout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const handleContinueWithGoogle = async () => {
    const result = await continueWithGoogle();
    setCurrentUser(result.user);
    setUserProfile(result.profile);
    return result;
  };

  const loginWithGoogle = async (role?: UserRole) => {
    const profile = await loginWithGoogleUser(role);
    setCurrentUser(auth.currentUser);
    setUserProfile(profile);
    return profile;
  };

  const selectRole = async (role: UserRole) => {
    const profile = await getUserProfile(auth.currentUser!.uid);
    if (!profile) throw new Error("No user profile was found for this account.");
    const roles = profile.roles ?? [profile.role];
    if (!roles.includes(role)) throw new Error(`This account does not have a ${role} profile.`);
    const selectedProfile = { ...profile, role };
    setUserProfile(selectedProfile);
    return selectedProfile;
  };

  const value = useMemo(
    () => ({ currentUser, userProfile, loading, register, logout, continueWithGoogle: handleContinueWithGoogle, loginWithGoogle, selectRole }),
    [currentUser, userProfile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
