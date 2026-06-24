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
import type { ReportedIssueStatus } from "../types/ReportedIssue";
import type {
  CreateOwnerSupportTicketData,
  OwnerSupportTicket,
} from "../types/OwnerSupportTicket";

const ownerSupportCollection = collection(db, "ownerSupportTickets");

function ticketFromDocument(document: { id: string; data: () => Record<string, unknown> }) {
  return { id: document.id, ...document.data() } as OwnerSupportTicket;
}

function sortByLatest(items: OwnerSupportTicket[]) {
  return items.sort(
    (first, second) =>
      (second.updatedAt?.toMillis() ?? second.createdAt?.toMillis() ?? 0) -
      (first.updatedAt?.toMillis() ?? first.createdAt?.toMillis() ?? 0),
  );
}

export async function createOwnerSupportTicket(data: CreateOwnerSupportTicketData) {
  const document = await addDoc(ownerSupportCollection, {
    ...data,
    status: "open",
    adminReply: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return document.id;
}

export async function getOwnerSupportTickets(ownerId: string) {
  const snapshot = await getDocs(
    query(ownerSupportCollection, where("ownerId", "==", ownerId)),
  );

  return sortByLatest(snapshot.docs.map(ticketFromDocument));
}

export async function getAllOwnerSupportTicketsAsAdmin() {
  const snapshot = await getDocs(ownerSupportCollection);
  return sortByLatest(snapshot.docs.map(ticketFromDocument));
}

export async function replyToOwnerSupportTicketAsAdmin(
  ticketId: string,
  status: ReportedIssueStatus,
  adminReply: string,
  resolvedBy: string,
) {
  await updateDoc(doc(db, "ownerSupportTickets", ticketId), {
    status,
    adminReply,
    resolvedBy,
    repliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
