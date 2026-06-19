import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { LegacyProperty as Property } from "../types/LegacyProperty";

type CreatePropertyData = Omit<Property, "id" | "createdAt" | "updatedAt">;
type UpdatePropertyData = Partial<CreatePropertyData>;

const propertiesCollection = collection(db, "properties");

function validateProperty(data: CreatePropertyData) {
  const requiredTextFields: Array<keyof CreatePropertyData> = [
    "propertyName",
    "location",
    "propertyType",
    "facilities",
    "imageUrl",
    "availabilityStatus",
    "description",
  ];

  for (const field of requiredTextFields) {
    const value = data[field];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`${field} is required`);
    }
  }

  if (!Number.isFinite(data.rentalFee) || data.rentalFee <= 0) {
    throw new Error("rentalFee must be greater than 0");
  }

  if (!Number.isFinite(data.numberOfRooms) || data.numberOfRooms <= 0) {
    throw new Error("numberOfRooms must be greater than 0");
  }
}

export async function createProperty(data: CreatePropertyData): Promise<string> {
  validateProperty(data);

  const document = await addDoc(propertiesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return document.id;
}

export async function getProperties(): Promise<Property[]> {
  const snapshot = await getDocs(propertiesCollection);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<Property, "id">),
  }));
}

export async function getPropertyById(propertyId: string): Promise<Property | null> {
  const snapshot = await getDoc(doc(db, "properties", propertyId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Property, "id">),
  };
}

export async function updateProperty(
  propertyId: string,
  data: UpdatePropertyData,
): Promise<void> {
  await updateDoc(doc(db, "properties", propertyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProperty(propertyId: string): Promise<void> {
  await deleteDoc(doc(db, "properties", propertyId));
}
