export interface Appointment {
  id?: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  unitType: string;
  message?: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt?: unknown;
}
