import type { Timestamp } from "firebase/firestore";
import type { ReportedIssueStatus } from "./ReportedIssue";

export interface OwnerSupportTicket {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  subject: string;
  message: string;
  status: ReportedIssueStatus;
  adminReply?: string;
  resolvedBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  repliedAt?: Timestamp;
}

export type CreateOwnerSupportTicketData = Omit<
  OwnerSupportTicket,
  "id" | "status" | "adminReply" | "resolvedBy" | "createdAt" | "updatedAt" | "repliedAt"
>;
