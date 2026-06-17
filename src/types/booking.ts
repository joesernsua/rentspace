export interface Booking {
  id?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  propertyId: string;
  propertyName: string;
  ownerId?: string;
  bookingDate: string;
  checkInDate: string;
  checkOutDate: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: unknown;
  updatedAt?: unknown;
}
