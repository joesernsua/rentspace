import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Appointment } from "../types/appointment";

type CreateAppointmentData = Omit<
  Appointment,
  "id" | "status" | "createdAt"
>;

const appointmentsCollection = collection(db, "appointments");

export async function createAppointment(
  data: CreateAppointmentData,
): Promise<string> {
  const requiredFields: Array<keyof CreateAppointmentData> = [
    "name",
    "email",
    "phone",
    "preferredDate",
    "preferredTime",
    "unitType",
  ];

  for (const field of requiredFields) {
    if (!data[field]?.trim()) {
      throw new Error(`${field} is required`);
    }
  }

  const document = await addDoc(appointmentsCollection, {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return document.id;
}

export async function getAppointments(): Promise<Appointment[]> {
  const snapshot = await getDocs(appointmentsCollection);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<Appointment, "id">),
  }));
}
