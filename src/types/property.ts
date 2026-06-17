export interface Property {
  id?: string;
  propertyName: string;
  location: string;
  rentalFee: number;
  numberOfRooms: number;
  propertyType: string;
  facilities: string;
  imageUrl: string;
  ownerId?: string;
  availabilityStatus: string;
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
