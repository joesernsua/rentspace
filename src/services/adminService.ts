import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { PaymentHistory } from "../types/PaymentHistory";
import type { Property, PropertyStatus } from "../types/Property";
import type { RentalRequest, RentalRequestStatus } from "../types/RentalRequest";
import type { AppUser } from "../types/User";

export interface AdminInvite {
  id: string;
  email: string;
  employeeRole: AdminEmployeeRole;
  status: "invited" | "accepted";
  createdBy: string;
  createdAt?: Timestamp;
  acceptedUid?: string;
  acceptedAt?: Timestamp;
  usedBy?: string;
  usedAt?: Timestamp;
}

export type AdminEmployeeRole = "manager" | "property-staff" | "finance-staff";

export function normalizeAdminInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getCollectionItems<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(
    (document) => ({ id: document.id, ...document.data() }) as T,
  );
}

export function getAllUsers(): Promise<AppUser[]> {
  return getDocs(collection(db, "users")).then((snapshot) =>
    snapshot.docs.map(
      (document) => ({ uid: document.id, ...document.data() }) as AppUser,
    ),
  );
}

export async function getUserAsAdmin(uid: string): Promise<AppUser | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return { uid: snapshot.id, ...snapshot.data() } as AppUser;
}

export function getAllProperties(): Promise<Property[]> {
  return getCollectionItems<Property>("properties");
}

export function getAllRentalRequests(): Promise<RentalRequest[]> {
  return getCollectionItems<RentalRequest>("rentalRequests");
}

export function getAllPaymentHistory(): Promise<PaymentHistory[]> {
  return getCollectionItems<PaymentHistory>("paymentHistory");
}

export function getAllAdminInvitesAsAdmin(): Promise<AdminInvite[]> {
  return getCollectionItems<AdminInvite>("adminInvites");
}

export function addAdminInviteAsBoss(
  email: string,
  createdBy: string,
  employeeRole: AdminEmployeeRole,
): Promise<void> {
  const normalizedEmail = normalizeAdminInviteEmail(email);
  return setDoc(doc(db, "adminInvites", normalizedEmail), {
    email: normalizedEmail,
    employeeRole,
    status: "invited",
    createdBy,
    createdAt: serverTimestamp(),
  });
}

export function deleteAdminInviteAsBoss(email: string): Promise<void> {
  return deleteDoc(doc(db, "adminInvites", normalizeAdminInviteEmail(email)));
}

export function deletePropertyAsAdmin(propertyId: string): Promise<void> {
  return deleteDoc(doc(db, "properties", propertyId));
}

export function deleteRentalRequestAsAdmin(requestId: string): Promise<void> {
  return deleteDoc(doc(db, "rentalRequests", requestId));
}

export function updateRentalRequestStatusAsAdmin(
  requestId: string,
  status: RentalRequestStatus,
): Promise<void> {
  return updateDoc(doc(db, "rentalRequests", requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function updatePropertyStatusAsAdmin(
  propertyId: string,
  status: PropertyStatus,
): Promise<void> {
  return updateDoc(doc(db, "properties", propertyId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
