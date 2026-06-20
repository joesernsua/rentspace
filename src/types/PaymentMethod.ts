import type { Timestamp } from "firebase/firestore";

export type UserPaymentMethodType = "card" | "google-pay" | "fpx";

export interface UserPaymentMethod {
  id: string;
  userId: string;
  type: UserPaymentMethodType;
  cardLast4?: string;
  expiration?: string;
  zipCode?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type SaveUserPaymentMethodData = Omit<
  UserPaymentMethod,
  "id" | "createdAt" | "updatedAt"
>;
