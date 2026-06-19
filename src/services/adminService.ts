import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Property } from "../types/Property";
import type { RentalRequest } from "../types/RentalRequest";
import type { AppUser } from "../types/User";

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

export function getAllProperties(): Promise<Property[]> {
  return getCollectionItems<Property>("properties");
}

export function getAllRentalRequests(): Promise<RentalRequest[]> {
  return getCollectionItems<RentalRequest>("rentalRequests");
}

export function deletePropertyAsAdmin(propertyId: string): Promise<void> {
  return deleteDoc(doc(db, "properties", propertyId));
}
