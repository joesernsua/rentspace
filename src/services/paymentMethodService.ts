import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  SaveUserPaymentMethodData,
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
