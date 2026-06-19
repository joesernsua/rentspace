import type { Timestamp } from "firebase/firestore";

export interface Conversation {
  id: string;
  participantIds: string[];
  ownerId: string;
  tenantId: string;
  ownerName: string;
  tenantName: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation?: string;
  propertyPrice?: number;
  propertyType?: string;
  propertyRooms?: number;
  propertyBathrooms?: number;
  propertyImageUrl: string;
  lastMessage: string;
  lastMessageAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: Timestamp;
}
