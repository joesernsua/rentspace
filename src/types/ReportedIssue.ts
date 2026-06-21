import type { Timestamp } from "firebase/firestore";

export const reportedIssueStatuses = ["open", "reviewing", "resolved", "rejected"] as const;

export type ReportedIssueStatus = (typeof reportedIssueStatuses)[number];

export interface ReportedIssue {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyOwnerId: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  reason: string;
  details: string;
  status: ReportedIssueStatus;
  adminReply?: string;
  resolvedBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  repliedAt?: Timestamp;
}

export type CreateReportedIssueData = Omit<
  ReportedIssue,
  "id" | "status" | "adminReply" | "resolvedBy" | "createdAt" | "updatedAt" | "repliedAt"
>;

