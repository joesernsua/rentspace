import type { Timestamp } from "firebase/firestore";
import type { UserPaymentMethodType } from "./PaymentMethod";

export interface PaymentHistory {
  id: string;
  requestId: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  ownerId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  contractYears: number;
  paymentMethodType: UserPaymentMethodType;
  cardLast4?: string;
  rentDeposit: number;
  utilityDeposit: number;
  monthlyRent: number;
  totalPaid: number;
  billingPeriod: "initial" | "monthly";
  lineItems?: Array<{
    label: string;
    monthNumber: number;
    type: "rent" | "utilities";
    amount: number;
  }>;
  status: "paid";
  paidAt?: Timestamp;
  createdAt?: Timestamp;
}

export type CreatePaymentHistoryData = Omit<
  PaymentHistory,
  "id" | "paidAt" | "createdAt"
>;
