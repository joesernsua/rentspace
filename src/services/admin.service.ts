import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import type { UserProfile } from "../context/AuthContext";
import type { Appointment } from "../types/appointment";
import type { Booking } from "../types/booking";
import type { Enquiry } from "../types/enquiry";
import type { LegacyProperty as Property } from "../types/LegacyProperty";

async function getCollectionItems<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName));

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as T[];
}

export function getUsers(): Promise<UserProfile[]> {
  return getCollectionItems<UserProfile>("users");
}

export function getAdminEnquiries(): Promise<Enquiry[]> {
  return getCollectionItems<Enquiry>("enquiries");
}

export function getAdminAppointments(): Promise<Appointment[]> {
  return getCollectionItems<Appointment>("appointments");
}

export function getAdminProperties(): Promise<Property[]> {
  return getCollectionItems<Property>("properties");
}

export function getAdminBookings(): Promise<Booking[]> {
  return getCollectionItems<Booking>("bookings");
}
