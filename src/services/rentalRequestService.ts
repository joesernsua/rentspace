import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  CreateRentalRequestData,
  RentalRequest,
  RentalRequestStatus,
} from "../types/RentalRequest";

const requestsCollection = collection(db, "rentalRequests");

function requestFromDocument(
  document: { id: string; data: () => Record<string, unknown> },
): RentalRequest {
  const data = document.data();
  return {
    id: document.id,
    contractYears: typeof data.contractYears === "number" ? data.contractYears : 1,
    ...data,
  } as RentalRequest;
}

export async function createRentalRequest(
  data: CreateRentalRequestData,
): Promise<string> {
  const requestDocument = await addDoc(requestsCollection, {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return requestDocument.id;
}

export async function getTenantRentalRequests(
  tenantId: string,
): Promise<RentalRequest[]> {
  const snapshot = await getDocs(
    query(requestsCollection, where("tenantId", "==", tenantId)),
  );
  return snapshot.docs.map(requestFromDocument);
}

export async function getOwnerRentalRequests(
  ownerId: string,
): Promise<RentalRequest[]> {
  const snapshot = await getDocs(
    query(requestsCollection, where("ownerId", "==", ownerId)),
  );
  return snapshot.docs.map(requestFromDocument);
}

export async function updateRentalRequestStatus(
  requestId: string,
  status: RentalRequestStatus,
): Promise<void> {
  await updateDoc(doc(db, "rentalRequests", requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function approveRentalRequestWithPayment(
  requestId: string,
  payment: {
    rentDeposit: number;
    utilityDeposit: number;
    monthlyRent: number;
  },
): Promise<void> {
  const totalDue = payment.rentDeposit + payment.utilityDeposit + payment.monthlyRent;

  await updateDoc(doc(db, "rentalRequests", requestId), {
    status: "approved",
    payment: {
      ...payment,
      totalDue,
      status: "unpaid",
    },
    updatedAt: serverTimestamp(),
  });
}

export async function markRentalRequestPaymentPaid(
  requestId: string,
): Promise<void> {
  await updateDoc(doc(db, "rentalRequests", requestId), {
    "payment.status": "paid",
    "payment.paidAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRentalRequestMonthlyUtilities(
  requestId: string,
  monthlyUtilities: Record<string, number>,
): Promise<void> {
  await updateDoc(doc(db, "rentalRequests", requestId), {
    "payment.monthlyUtilities": monthlyUtilities,
    updatedAt: serverTimestamp(),
  });
}
