import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  CreatePaymentHistoryData,
  PaymentHistory,
} from "../types/PaymentHistory";

const paymentHistoryCollection = collection(db, "paymentHistory");

export async function createPaymentHistory(
  data: CreatePaymentHistoryData,
): Promise<string> {
  const paymentHistoryDocument = await addDoc(paymentHistoryCollection, {
    ...data,
    paidAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return paymentHistoryDocument.id;
}

export async function getTenantPaymentHistory(
  tenantId: string,
): Promise<PaymentHistory[]> {
  const snapshot = await getDocs(
    query(paymentHistoryCollection, where("tenantId", "==", tenantId)),
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }) as PaymentHistory);
}

export async function getOwnerPaymentHistory(
  ownerId: string,
): Promise<PaymentHistory[]> {
  const snapshot = await getDocs(
    query(paymentHistoryCollection, where("ownerId", "==", ownerId)),
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }) as PaymentHistory);
}
