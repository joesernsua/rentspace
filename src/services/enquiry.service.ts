import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Enquiry } from "../types/enquiry";

type CreateEnquiryData = Omit<Enquiry, "id" | "status" | "createdAt">;

const enquiriesCollection = collection(db, "enquiries");

export async function createEnquiry(data: CreateEnquiryData): Promise<string> {
  const requiredFields: Array<keyof CreateEnquiryData> = [
    "name",
    "email",
    "phone",
    "message",
  ];

  for (const field of requiredFields) {
    if (!data[field]?.trim()) {
      throw new Error(`${field} is required`);
    }
  }

  const document = await addDoc(enquiriesCollection, {
    ...data,
    status: "new",
    createdAt: serverTimestamp(),
  });

  return document.id;
}

export async function getEnquiries(): Promise<Enquiry[]> {
  const snapshot = await getDocs(enquiriesCollection);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<Enquiry, "id">),
  }));
}
