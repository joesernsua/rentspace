import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  CreatePropertyData,
  Property,
  UpdatePropertyData,
} from "../types/Property";

const propertiesCollection = collection(db, "properties");

function propertyFromDocument(
  document: { id: string; data: () => Record<string, unknown> },
): Property {
  return { id: document.id, ...document.data() } as Property;
}

export async function createProperty(data: CreatePropertyData): Promise<string> {
  const propertyDocument = await addDoc(propertiesCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return propertyDocument.id;
}

export async function getOwnerProperties(ownerId: string): Promise<Property[]> {
  const snapshot = await getDocs(
    query(propertiesCollection, where("ownerId", "==", ownerId)),
  );
  return snapshot.docs.map(propertyFromDocument);
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

export async function getAvailableProperties(): Promise<Property[]> {
  const snapshot = await getDocs(
    query(propertiesCollection, where("status", "==", "available")),
  );
  return snapshot.docs.map(propertyFromDocument);
}

export async function getPropertyById(
  propertyId: string,
): Promise<Property | null> {
  const snapshot = await getDoc(doc(db, "properties", propertyId));
  return snapshot.exists() ? propertyFromDocument(snapshot) : null;
}
