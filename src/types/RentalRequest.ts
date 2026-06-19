import type { Timestamp } from "firebase/firestore";

export const rentalRequestStatuses = ["pending", "approved", "rejected"] as const;
export type RentalRequestStatus = (typeof rentalRequestStatuses)[number];

export interface RentalRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyImageUrl?: string;
  ownerId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  message: string;
  status: RentalRequestStatus;
  payment?: {
    rentDeposit: number;
    utilityDeposit: number;
    monthlyRent: number;
    totalDue: number;
    status: "unpaid" | "paid";
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type CreateRentalRequestData = Omit<
  RentalRequest,
  "id" | "status" | "createdAt" | "updatedAt"
>;
