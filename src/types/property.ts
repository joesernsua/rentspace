import type { Timestamp } from "firebase/firestore";

export const propertyTypes = ["Room", "Apartment", "House", "Condo"] as const;
export const propertyStatuses = ["available", "pending", "rented"] as const;

export type PropertyType = (typeof propertyTypes)[number];
export type PropertyStatus = (typeof propertyStatuses)[number];

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  location: string;
  address: string;
  price: number;
  type: PropertyType;
  rooms: number;
  bathrooms: number;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  status: PropertyStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type CreatePropertyData = Omit<Property, "id" | "createdAt" | "updatedAt">;
export type UpdatePropertyData = Partial<Omit<CreatePropertyData, "ownerId">>;
