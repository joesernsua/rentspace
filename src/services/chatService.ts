import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { Conversation, ChatMessage } from "../types/Chat";

const conversationsCollection = collection(db, "conversations");

function conversationFromDocument(
  document: { id: string; data: () => Record<string, unknown> },
): Conversation {
  return { id: document.id, ...document.data() } as Conversation;
}

function messageFromDocument(
  document: { id: string; data: () => Record<string, unknown> },
): ChatMessage {
  return { id: document.id, ...document.data() } as ChatMessage;
}

export type StartConversationInput = {
  ownerId: string;
  ownerName: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation?: string;
  propertyPrice?: number;
  propertyType?: string;
  propertyRooms?: number;
  propertyBathrooms?: number;
  propertyImageUrl: string;
  message: string;
  senderId: string;
  senderName: string;
};

export function getConversationId(propertyId: string, tenantId: string, ownerId: string) {
  return `${propertyId}_${tenantId}_${ownerId}`;
}

export async function startPropertyConversation(input: StartConversationInput) {
  const conversationId = getConversationId(input.propertyId, input.tenantId, input.ownerId);
  const conversationRef = doc(db, "conversations", conversationId);
  const trimmedMessage = input.message.trim();

  await setDoc(
    conversationRef,
    {
      participantIds: [input.tenantId, input.ownerId],
      ownerId: input.ownerId,
      tenantId: input.tenantId,
      ownerName: input.ownerName,
      tenantName: input.tenantName,
      propertyId: input.propertyId,
      propertyTitle: input.propertyTitle,
      propertyLocation: input.propertyLocation ?? "",
      propertyPrice: input.propertyPrice ?? 0,
      propertyType: input.propertyType ?? "",
      propertyRooms: input.propertyRooms ?? 0,
      propertyBathrooms: input.propertyBathrooms ?? 0,
      propertyImageUrl: input.propertyImageUrl,
      lastMessage: trimmedMessage,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await sendConversationMessage({
    conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    text: trimmedMessage,
  });

  return conversationId;
}

export async function sendConversationMessage({
  conversationId,
  senderId,
  senderName,
  text,
}: {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
}) {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    conversationId,
    senderId,
    senderName,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "conversations", conversationId),
    {
      lastMessage: trimmedText,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const snapshot = await getDocs(
    query(conversationsCollection, where("participantIds", "array-contains", userId)),
  );

  return snapshot.docs
    .map(conversationFromDocument)
    .sort(
      (first, second) =>
        (second.lastMessageAt?.toMillis() ?? 0) - (first.lastMessageAt?.toMillis() ?? 0),
    );
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const snapshot = await getDocs(
    query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc")),
  );

  return snapshot.docs.map(messageFromDocument);
}
