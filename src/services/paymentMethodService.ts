import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  SaveUserPaymentMethodData,
  UserPaymentMethod,
  UserPaymentMethodType,
} from "../types/PaymentMethod";

function getPaymentMethodDocumentId(
  userId: string,
  type: UserPaymentMethodType,
) {
  return `${userId}_${type}`;
}

export async function saveUserPaymentMethod(
  data: SaveUserPaymentMethodData,
): Promise<void> {
  const paymentMethodDocument = doc(
    db,
    "paymentMethods",
    getPaymentMethodDocumentId(data.userId, data.type),
  );

  await setDoc(
    paymentMethodDocument,
    {
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUserPaymentMethods(
  userId: string,
): Promise<UserPaymentMethod[]> {
  const snapshot = await getDocs(
    query(collection(db, "paymentMethods"), where("userId", "==", userId)),
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }) as UserPaymentMethod);
}

export async function deleteUserPaymentMethod(
  userId: string,
  type: UserPaymentMethodType,
): Promise<void> {
  await deleteDoc(doc(db, "paymentMethods", getPaymentMethodDocumentId(userId, type)));
}
