import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Booking } from "../types/booking";

type CreateBookingData = Omit<Booking, "id" | "status" | "createdAt" | "updatedAt">;

const bookingsCollection = collection(db, "bookings");

export async function createBooking(data: CreateBookingData): Promise<string> {
  const requiredFields: Array<keyof CreateBookingData> = [
    "customerId",
    "customerName",
    "customerEmail",
    "propertyId",
    "propertyName",
    "bookingDate",
    "checkInDate",
    "checkOutDate",
  ];

  for (const field of requiredFields) {
    if (!data[field]?.trim()) {
      throw new Error(`${field} is required`);
    }
  }

  const document = await addDoc(bookingsCollection, {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return document.id;
}

export async function getBookings(): Promise<Booking[]> {
  const snapshot = await getDocs(bookingsCollection);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<Booking, "id">),
  }));
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking["status"],
): Promise<void> {
  await updateDoc(doc(db, "bookings", bookingId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
