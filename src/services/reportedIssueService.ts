import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  CreateReportedIssueData,
  ReportedIssue,
  ReportedIssueStatus,
} from "../types/ReportedIssue";

const reportedIssuesCollection = collection(db, "reportedIssues");

function reportedIssueFromDocument(document: { id: string; data: () => Record<string, unknown> }) {
  return { id: document.id, ...document.data() } as ReportedIssue;
}

function sortByLatest(items: ReportedIssue[]) {
  return items.sort(
    (first, second) =>
      (second.updatedAt?.toMillis() ?? second.createdAt?.toMillis() ?? 0) -
      (first.updatedAt?.toMillis() ?? first.createdAt?.toMillis() ?? 0),
  );
}

export async function createReportedIssue(data: CreateReportedIssueData) {
  const document = await addDoc(reportedIssuesCollection, {
    ...data,
    status: "open",
    adminReply: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return document.id;
}

export async function getTenantReportedIssues(tenantId: string) {
  const snapshot = await getDocs(
    query(reportedIssuesCollection, where("tenantId", "==", tenantId)),
  );

  return sortByLatest(snapshot.docs.map(reportedIssueFromDocument));
}

export async function getAllReportedIssuesAsAdmin() {
  const snapshot = await getDocs(reportedIssuesCollection);
  return sortByLatest(snapshot.docs.map(reportedIssueFromDocument));
}

export async function replyToReportedIssueAsAdmin(
  issueId: string,
  status: ReportedIssueStatus,
  adminReply: string,
  resolvedBy: string,
) {
  await updateDoc(doc(db, "reportedIssues", issueId), {
    status,
    adminReply,
    resolvedBy,
    repliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
