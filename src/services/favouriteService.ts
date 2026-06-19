import type { Property } from "../types/Property";

const favouriteStorageKey = "rentspace-favourites";

export function getFavouriteProperties(): Property[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(favouriteStorageKey);
    return stored ? (JSON.parse(stored) as Property[]) : [];
  } catch {
    return [];
  }
}

export function isFavouriteProperty(propertyId: string) {
  return getFavouriteProperties().some((property) => property.id === propertyId);
}

export function toggleFavouriteProperty(property: Property) {
  const favourites = getFavouriteProperties();
  const isFavourite = favourites.some((item) => item.id === property.id);
  const nextFavourites = isFavourite
    ? favourites.filter((item) => item.id !== property.id)
    : [property, ...favourites];

  window.localStorage.setItem(favouriteStorageKey, JSON.stringify(nextFavourites));
  return !isFavourite;
}

export function getPropertyCoverImage(property: Property) {
  return property.imageUrls?.[0] || property.imageUrl;
}
