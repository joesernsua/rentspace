import type { Timestamp } from "firebase/firestore";

export type UserRole = "tenant" | "owner" | "admin";

export interface AppUser {
  uid: string;
  name: string;
  /** Compatibility with older, currently inactive project components. */
  displayName?: string | null;
  email: string;
  role: UserRole;
  roles?: Array<Exclude<UserRole, "admin"> | "admin">;
  phone: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type RegisterUserInput = {
  name: string;
  email: string;
  role: Exclude<UserRole, "admin">;
};
