export interface Enquiry {
  id?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt?: unknown;
}
